import type { Restaurant } from '../types';

// Combine multiple AbortSignals into one
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) { controller.abort(s.reason); return controller.signal; }
    s.addEventListener('abort', () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}

// Multiple Overpass servers for failover
const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

function getMaxResults(radius: number): number {
  if (radius <= 1000) return 200;
  if (radius <= 2000) return 300;
  if (radius <= 5000) return 500;
  if (radius <= 10000) return 750;
  return 1000;
}

function getTimeout(radius: number): number {
  if (radius <= 2000) return 15;
  if (radius <= 10000) return 25;
  return 30;
}

// DACH region bounding box (Germany, Austria, Switzerland)
const DACH_BOUNDS = { minLat: 45.8, maxLat: 55.1, minLng: 5.8, maxLng: 17.2 };

function isInDACH(lat: number, lng: number): boolean {
  return lat >= DACH_BOUNDS.minLat && lat <= DACH_BOUNDS.maxLat &&
         lng >= DACH_BOUNDS.minLng && lng <= DACH_BOUNDS.maxLng;
}

export async function fetchNearbyRestaurants(
  lat: number,
  lng: number,
  radius: number = 5000,
  signal?: AbortSignal
): Promise<Restaurant[]> {
  if (!isInDACH(lat, lng)) {
    console.warn('Coordinates outside DACH region, skipping Overpass fetch');
    return [];
  }

  const maxResults = getMaxResults(radius);
  const timeout = getTimeout(radius);

  const query = `
    [out:json][timeout:${timeout}];
    (
      nwr["amenity"~"restaurant|fast_food|cafe|bar|pub|biergarten|food_court|ice_cream"]["name"](around:${radius},${lat},${lng});
    );
    out center;
  `;

  try {
    let data: any = null;

    for (const server of OVERPASS_SERVERS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);
        const fetchSignal = signal
          ? anySignal([signal, controller.signal])
          : controller.signal;

        const response = await fetch(server, {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          signal: fetchSignal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`${server} returned ${response.status}`);

        data = await response.json();
        break; // Success — stop trying other servers
      } catch (err) {
        if (signal?.aborted) throw err; // User-initiated abort — don't retry
        console.warn(`Overpass server failed: ${server}`, err);
        continue; // Try next server
      }
    }

    if (!data) throw new Error('All Overpass servers failed');

    // Haversine for sorting by distance
    const toRad = (x: number) => (x * Math.PI) / 180;
    const haversine = (lat2: number, lng2: number) => {
      const R = 6371e3;
      const dp = toRad(lat2 - lat);
      const dl = toRad(lng2 - lng);
      const a = Math.sin(dp / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(lat2)) * Math.sin(dl / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const restaurants: Restaurant[] = data.elements
      .map((el: Record<string, unknown>) => {
        const tags = (el.tags || {}) as Record<string, string>;
        const name = tags.name;
        if (!name) return null;

        // Capitalize first letter of cuisine
        let cuisine = tags.cuisine?.split(';')[0]?.trim();
        if (cuisine) {
          cuisine = cuisine.replace(/_/g, ' ');
          cuisine = cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
        } else {
          // Fallback to amenity type
          const amenity = tags.amenity;
          if (amenity === 'cafe') cuisine = 'Cafe';
          else if (amenity === 'fast_food') cuisine = 'Fast Food';
          else if (amenity === 'biergarten') cuisine = 'Biergarten';
          else if (amenity === 'ice_cream') cuisine = 'Eisdiele';
          else if (amenity === 'food_court') cuisine = 'Food Court';
          else cuisine = 'Restaurant';
        }

        // For ways/relations, coordinates are in center property
        const center = (el.center || {}) as Record<string, number>;
        const elLat = (el.lat as number) || center.lat;
        const elLng = (el.lon as number) || center.lon;
        if (!elLat || !elLng) return null;

        return {
          id: `osm-${el.id}`,
          name,
          lat: elLat,
          lng: elLng,
          address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']]
            .filter(Boolean)
            .join(' ') || undefined,
          cuisine,
          clean_score: null,
          rating_count: 0,
        } satisfies Restaurant;
      })
      .filter((r: Restaurant | null): r is Restaurant => r !== null)
      .sort((a: Restaurant, b: Restaurant) => haversine(a.lat, a.lng) - haversine(b.lat, b.lng))
      .slice(0, maxResults);

    return restaurants;
  } catch (error) {
    console.error('Failed to fetch from Overpass:', error);
    return [];
  }
}

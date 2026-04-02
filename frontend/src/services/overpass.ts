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

// ─── Google Places API (proxied through backend) ─────────────────────────────

const GOOGLE_INCLUDED_TYPES = [
  'restaurant',
  'cafe',
  'bar',
  'fast_food_restaurant',
  'italian_restaurant',
  'chinese_restaurant',
  'japanese_restaurant',
  'korean_restaurant',
  'mexican_restaurant',
  'indian_restaurant',
  'thai_restaurant',
  'greek_restaurant',
  'turkish_restaurant',
  'vietnamese_restaurant',
  'american_restaurant',
  'french_restaurant',
  'german_restaurant',
  'spanish_restaurant',
  'mediterranean_restaurant',
  'middle_eastern_restaurant',
  'seafood_restaurant',
  'steak_house',
  'sushi_restaurant',
  'ramen_restaurant',
  'pizza_restaurant',
  'hamburger_restaurant',
  'brunch_restaurant',
  'breakfast_restaurant',
  'sandwich_shop',
  'ice_cream_shop',
  'coffee_shop',
  'pub',
  'wine_bar',
];

// Friendly German names for Google Places types
const TYPE_DISPLAY_NAMES: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  bar: 'Bar',
  fast_food_restaurant: 'Fast Food',
  italian_restaurant: 'Italienisch',
  chinese_restaurant: 'Chinesisch',
  japanese_restaurant: 'Japanisch',
  korean_restaurant: 'Koreanisch',
  mexican_restaurant: 'Mexikanisch',
  indian_restaurant: 'Indisch',
  thai_restaurant: 'Thai',
  greek_restaurant: 'Griechisch',
  turkish_restaurant: 'Türkisch',
  vietnamese_restaurant: 'Vietnamesisch',
  american_restaurant: 'Amerikanisch',
  french_restaurant: 'Französisch',
  german_restaurant: 'Deutsch',
  spanish_restaurant: 'Spanisch',
  mediterranean_restaurant: 'Mediterran',
  middle_eastern_restaurant: 'Orientalisch',
  seafood_restaurant: 'Fisch & Meeresfrüchte',
  steak_house: 'Steakhaus',
  sushi_restaurant: 'Sushi',
  ramen_restaurant: 'Ramen',
  pizza_restaurant: 'Pizzeria',
  hamburger_restaurant: 'Burger',
  brunch_restaurant: 'Brunch',
  breakfast_restaurant: 'Frühstück',
  sandwich_shop: 'Sandwiches',
  ice_cream_shop: 'Eiscafé',
  coffee_shop: 'Kaffee',
  pub: 'Pub',
  wine_bar: 'Weinbar',
};

interface GooglePlace {
  id: string;
  displayName?: { text: string; languageCode?: string };
  location?: { latitude: number; longitude: number };
  formattedAddress?: string;
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
  rating?: number;
  userRatingCount?: number;
}

async function fetchGooglePlacesBatch(
  lat: number,
  lng: number,
  radius: number,
  signal?: AbortSignal,
): Promise<GooglePlace[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  const fetchSignal = signal
    ? anySignal([signal, controller.signal])
    : controller.signal;

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  const response = await fetch(`${apiUrl}/places/nearby`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lat,
      lng,
      radius: Math.min(radius, 50000),
      includedTypes: GOOGLE_INCLUDED_TYPES,
    }),
    signal: fetchSignal,
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Places proxy returned ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.places || [];
}

async function fetchFromGooglePlaces(
  lat: number,
  lng: number,
  radius: number,
  signal?: AbortSignal,
): Promise<Restaurant[]> {
  // API key is now on the backend — no client-side check needed

  // Fetch 2 batches in parallel: close (2km) + wider (full radius)
  // This gives us up to 40 unique results instead of 20
  const nearRadius = Math.min(2000, radius);
  const [nearPlaces, widePlaces] = await Promise.all([
    fetchGooglePlacesBatch(lat, lng, nearRadius, signal),
    radius > 2000
      ? fetchGooglePlacesBatch(lat, lng, radius, signal)
      : Promise.resolve([]),
  ]);

  // Merge and deduplicate by place ID
  const seen = new Set<string>();
  const places: GooglePlace[] = [];
  for (const p of [...nearPlaces, ...widePlaces]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      places.push(p);
    }
  }

  // Haversine for sorting by distance
  const toRad = (x: number) => (x * Math.PI) / 180;
  const haversine = (lat2: number, lng2: number) => {
    const R = 6371e3;
    const dp = toRad(lat2 - lat);
    const dl = toRad(lng2 - lng);
    const a = Math.sin(dp / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(lat2)) * Math.sin(dl / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const restaurants: Restaurant[] = places
    .map((place): Restaurant | null => {
      const name = place.displayName?.text;
      if (!name) return null;

      const plLat = place.location?.latitude;
      const plLng = place.location?.longitude;
      if (plLat == null || plLng == null) return null;

      const cuisine =
        place.primaryTypeDisplayName?.text ||
        (place.primaryType ? TYPE_DISPLAY_NAMES[place.primaryType] : undefined) ||
        'Restaurant';

      return {
        id: `google-${place.id}`,
        name,
        lat: plLat,
        lng: plLng,
        address: place.formattedAddress || undefined,
        cuisine,
        clean_score: null,
        rating_count: 0,
      };
    })
    .filter((r): r is Restaurant => r !== null)
    .sort((a, b) => haversine(a.lat, a.lng) - haversine(b.lat, b.lng));

  return restaurants;
}

// ─── Overpass API (Fallback) ───────────────────────────────────────────────

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

async function fetchFromOverpass(
  lat: number,
  lng: number,
  radius: number,
  signal?: AbortSignal,
): Promise<Restaurant[]> {
  const maxResults = getMaxResults(radius);
  const timeout = getTimeout(radius);

  const query = `
    [out:json][timeout:${timeout}];
    (
      nwr["amenity"~"restaurant|fast_food|cafe|bar|pub|biergarten|food_court|ice_cream"]["name"](around:${radius},${lat},${lng});
    );
    out center;
  `;

  // Try all servers in parallel — first successful response wins
  const PER_SERVER_TIMEOUT = 8_000;

  const data: any = await Promise.any(
    OVERPASS_SERVERS.map(async (server) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PER_SERVER_TIMEOUT);
      const fetchSignal = signal
        ? anySignal([signal, controller.signal])
        : controller.signal;

      try {
        const response = await fetch(server, {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          signal: fetchSignal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`${server} returned ${response.status}`);

        return await response.json();
      } catch (err) {
        clearTimeout(timeoutId);
        if (signal?.aborted) throw err;
        console.warn(`Overpass server failed: ${server}`, err);
        throw err;
      }
    })
  ).catch((aggregate) => {
    // If the caller aborted, re-throw abort error
    if (signal?.aborted) throw aggregate.errors?.[0] ?? aggregate;
    throw new Error('All Overpass servers failed');
  });

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

      let cuisine = tags.cuisine?.split(';')[0]?.trim();
      if (cuisine) {
        cuisine = cuisine.replace(/_/g, ' ');
        cuisine = cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
      } else {
        const amenity = tags.amenity;
        if (amenity === 'cafe') cuisine = 'Cafe';
        else if (amenity === 'fast_food') cuisine = 'Fast Food';
        else if (amenity === 'biergarten') cuisine = 'Biergarten';
        else if (amenity === 'ice_cream') cuisine = 'Eisdiele';
        else if (amenity === 'food_court') cuisine = 'Food Court';
        else cuisine = 'Restaurant';
      }

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
}

// ─── Public API: Google Places primary, Overpass fallback ──────────────────

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
    console.warn('Coordinates outside DACH region, skipping restaurant fetch');
    return [];
  }

  // Try Google Places first
  try {
    const results = await fetchFromGooglePlaces(lat, lng, radius, signal);
    if (results.length > 0) {
      console.log(`Google Places returned ${results.length} restaurants`);
      return results;
    }
    console.warn('Google Places returned 0 results, falling back to Overpass');
  } catch (err) {
    if (signal?.aborted) throw err;
    console.warn('Google Places failed, falling back to Overpass:', err);
  }

  // Fallback to Overpass
  try {
    const results = await fetchFromOverpass(lat, lng, radius, signal);
    console.log(`Overpass fallback returned ${results.length} restaurants`);
    return results;
  } catch (err) {
    if (signal?.aborted) throw err;
    console.error('Both Google Places and Overpass failed:', err);
    return [];
  }
}

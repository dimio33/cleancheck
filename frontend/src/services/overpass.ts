import type { Restaurant } from '../types';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

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

export async function fetchNearbyRestaurants(
  lat: number,
  lng: number,
  radius: number = 5000
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

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!response.ok) throw new Error('Overpass API error');

    const data = await response.json();

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

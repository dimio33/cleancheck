import type { Restaurant } from '../types';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export async function fetchNearbyRestaurants(
  lat: number,
  lng: number,
  radius: number = 1000
): Promise<Restaurant[]> {
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="restaurant"](around:${radius},${lat},${lng});
      node["amenity"="fast_food"](around:${radius},${lat},${lng});
      node["amenity"="cafe"](around:${radius},${lat},${lng});
    );
    out body;
  `;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!response.ok) throw new Error('Overpass API error');

    const data = await response.json();

    return data.elements.map((el: Record<string, unknown>) => {
      const tags = (el.tags || {}) as Record<string, string>;
      return {
        id: `osm-${el.id}`,
        name: tags.name || 'Unknown Restaurant',
        lat: el.lat as number,
        lng: el.lon as number,
        address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']]
          .filter(Boolean)
          .join(' ') || undefined,
        cuisine: tags.cuisine?.split(';')[0] || tags.amenity as string || undefined,
        clean_score: null,
        rating_count: 0,
      } satisfies Restaurant;
    });
  } catch (error) {
    console.error('Failed to fetch from Overpass:', error);
    return [];
  }
}

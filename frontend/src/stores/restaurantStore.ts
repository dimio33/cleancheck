import { create } from 'zustand';
import type { Restaurant } from '../types';
import { fetchNearbyRestaurants } from '../services/overpass';
import api from '../services/api';

interface RestaurantStore {
  restaurants: Restaurant[];
  loading: boolean;
  error: string | null;
  radius: number;
  lastFetchLocation: { lat: number; lng: number } | null;
  mapCenter: { lat: number; lng: number } | null;
  mapZoom: number | null;
  _abortController: AbortController | null;
  fetchRestaurants: (lat: number, lng: number) => Promise<void>;
  setRadius: (radius: number) => void;
  setMapView: (lat: number, lng: number, zoom: number) => void;
  getById: (id: string) => Restaurant | undefined;
  updateRestaurantScore: (id: string, score: number, ratingCount: number) => void;
  invalidate: () => void;
}

const MIN_REFETCH_DISTANCE = 500; // Only refetch if user moved 500m+

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const useRestaurantStore = create<RestaurantStore>((set, get) => ({
  restaurants: [],
  loading: false,
  error: null,
  radius: 5000,
  lastFetchLocation: null,
  mapCenter: null,
  mapZoom: null,
  _abortController: null,

  fetchRestaurants: async (lat: number, lng: number) => {
    const { lastFetchLocation, radius } = get();

    // Don't refetch if user hasn't moved much
    if (lastFetchLocation) {
      const moved = haversine(lat, lng, lastFetchLocation.lat, lastFetchLocation.lng);
      if (moved < MIN_REFETCH_DISTANCE) return;
    }

    // Abort previous in-flight request
    get()._abortController?.abort();
    const controller = new AbortController();
    set({ loading: true, error: null, _abortController: controller });

    try {
      const results = await fetchNearbyRestaurants(lat, lng, radius, controller.signal);

      // Ignore if this request was aborted (a newer one took over)
      if (controller.signal.aborted) return;

      if (results.length > 0) {
        // Merge scores from backend DB — restaurants that have been rated
        try {
          const radiusKm = radius / 1000;
          const { data } = await api.get(`/restaurants?lat=${lat}&lng=${lng}&radius=${radiusKm}`);
          const dbRestaurants: Record<string, { clean_score: number; total_ratings: number }> = {};
          for (const r of data.restaurants || []) {
            if (r.osm_id) {
              const score = Number(r.clean_score);
              dbRestaurants[String(r.osm_id)] = {
                clean_score: isNaN(score) ? 0 : score,
                total_ratings: parseInt(String(r.total_ratings), 10) || 0,
              };
            }
          }

          // Merge DB scores into Overpass results
          for (const r of results) {
            const osmId = r.id.replace('osm-', '');
            const dbData = dbRestaurants[osmId];
            if (dbData && dbData.total_ratings > 0) {
              r.clean_score = dbData.clean_score;
              r.rating_count = dbData.total_ratings;
            }
          }
        } catch {
          // Backend unavailable — show Overpass results without scores
        }

        set({ restaurants: results, loading: false, lastFetchLocation: { lat, lng }, error: null });
      } else {
        // Keep old restaurants — don't wipe data on empty Overpass response
        set({
          loading: false,
          lastFetchLocation: { lat, lng },
          error: get().restaurants.length === 0 ? 'no_results' : null,
        });
      }
    } catch (err) {
      // Ignore abort errors (request was cancelled by a newer one)
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Keep old restaurants — don't wipe data on fetch error
      set({
        loading: false,
        error: get().restaurants.length === 0 ? 'fetch_error' : null,
      });
    }
  },

  setRadius: (radius: number) => {
    set({ radius, lastFetchLocation: null });
  },

  setMapView: (lat: number, lng: number, zoom: number) => {
    set({ mapCenter: { lat, lng }, mapZoom: zoom });
  },

  getById: (id: string) => {
    return get().restaurants.find((r) => r.id === id);
  },

  updateRestaurantScore: (id: string, score: number, ratingCount: number) => {
    set({
      restaurants: get().restaurants.map((r) =>
        r.id === id ? { ...r, clean_score: score, rating_count: ratingCount } : r
      ),
    });
  },

  invalidate: () => {
    set({ lastFetchLocation: null });
  },
}));

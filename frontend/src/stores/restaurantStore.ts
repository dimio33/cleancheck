import { create } from 'zustand';
import type { Restaurant } from '../types';
import { fetchNearbyRestaurants } from '../services/overpass';
import { MOCK_RESTAURANTS } from '../data/mockData';

interface RestaurantStore {
  restaurants: Restaurant[];
  loading: boolean;
  error: string | null;
  radius: number;
  lastFetchLocation: { lat: number; lng: number } | null;
  fetchRestaurants: (lat: number, lng: number) => Promise<void>;
  setRadius: (radius: number) => void;
  getById: (id: string) => Restaurant | undefined;
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

  fetchRestaurants: async (lat: number, lng: number) => {
    const { lastFetchLocation, loading, radius } = get();

    // Don't refetch if already loading
    if (loading) return;

    // Don't refetch if user hasn't moved much
    if (lastFetchLocation) {
      const moved = haversine(lat, lng, lastFetchLocation.lat, lastFetchLocation.lng);
      if (moved < MIN_REFETCH_DISTANCE) return;
    }

    set({ loading: true, error: null });

    try {
      const results = await fetchNearbyRestaurants(lat, lng, radius);

      if (results.length > 0) {
        set({ restaurants: results, loading: false, lastFetchLocation: { lat, lng } });
      } else {
        // Fallback to mock data if no results (e.g. rural area)
        set({
          restaurants: MOCK_RESTAURANTS,
          loading: false,
          lastFetchLocation: { lat, lng },
          error: 'no_results_fallback',
        });
      }
    } catch {
      // Fallback to mock data on error
      set({
        restaurants: MOCK_RESTAURANTS,
        loading: false,
        lastFetchLocation: { lat, lng },
        error: 'fetch_error_fallback',
      });
    }
  },

  setRadius: (radius: number) => {
    set({ radius, lastFetchLocation: null });
  },

  getById: (id: string) => {
    return get().restaurants.find((r) => r.id === id);
  },
}));

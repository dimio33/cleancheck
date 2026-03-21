import { create } from 'zustand';

interface FavoritesStore {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favorites: (() => {
    try {
      return JSON.parse(localStorage.getItem('cleancheck_favorites') || '[]');
    } catch {
      return [];
    }
  })(),

  toggleFavorite: (id: string) => {
    const { favorites } = get();
    const next = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    localStorage.setItem('cleancheck_favorites', JSON.stringify(next));
    set({ favorites: next });
  },

  isFavorite: (id: string) => get().favorites.includes(id),
}));

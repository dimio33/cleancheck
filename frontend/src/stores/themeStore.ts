import { create } from 'zustand';

interface ThemeStore {
  mode: 'light';
  setMode: (mode: string) => void;
  init: () => void;
}

export const useThemeStore = create<ThemeStore>(() => ({
  mode: 'light',
  setMode: () => {},
  init: () => {
    document.documentElement.classList.remove('dark');
  },
}));

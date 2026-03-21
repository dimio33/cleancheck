import { create } from 'zustand';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  init: () => void;
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else if (mode === 'light') {
    root.classList.remove('dark');
  } else {
    // System preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  }
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: (localStorage.getItem('cleancheck_theme') as ThemeMode) || 'light',

  setMode: (mode: ThemeMode) => {
    localStorage.setItem('cleancheck_theme', mode);
    applyTheme(mode);
    set({ mode });
  },

  init: () => {
    const saved = (localStorage.getItem('cleancheck_theme') as ThemeMode) || 'light';
    applyTheme(saved);
    set({ mode: saved });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const current = localStorage.getItem('cleancheck_theme') as ThemeMode;
      if (current === 'system') applyTheme('system');
    });
  },
}));

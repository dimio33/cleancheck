import { create } from 'zustand';
import type { User } from '../types';
import api from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  loginAsGuest: () => void;
}

function storeTokens(token: string, refreshToken?: string) {
  localStorage.setItem('cleancheck_token', token);
  if (refreshToken) localStorage.setItem('cleancheck_refresh_token', refreshToken);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const stored = localStorage.getItem('cleancheck_user');
      return stored ? JSON.parse(stored) as User : null;
    } catch {
      return null;
    }
  })(),
  token: localStorage.getItem('cleancheck_token'),
  isAuthenticated: !!localStorage.getItem('cleancheck_token'),

  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    storeTokens(data.token, data.refreshToken);
    const user: User = {
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
      avatar: data.user.avatar_url || undefined,
      created_at: data.user.created_at,
      rating_count: data.user.total_ratings || 0,
      restaurant_count: 0,
      average_score: 0,
      badges: [],
    };
    localStorage.setItem('cleancheck_user', JSON.stringify(user));
    set({ user, token: data.token, isAuthenticated: true });
  },

  register: async (username: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { username, email, password });
    storeTokens(data.token, data.refreshToken);
    const user: User = {
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
      avatar: data.user.avatar_url || undefined,
      created_at: data.user.created_at,
      rating_count: data.user.total_ratings || 0,
      restaurant_count: 0,
      average_score: 0,
      badges: [],
    };
    localStorage.setItem('cleancheck_user', JSON.stringify(user));
    set({ user, token: data.token, isAuthenticated: true });
  },

  logout: () => {
    const refreshToken = localStorage.getItem('cleancheck_refresh_token');
    if (refreshToken) {
      // Best-effort server-side revocation
      api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    localStorage.removeItem('cleancheck_token');
    localStorage.removeItem('cleancheck_refresh_token');
    localStorage.removeItem('cleancheck_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user: User) => {
    localStorage.setItem('cleancheck_user', JSON.stringify(user));
    set({ user });
  },

  loginAsGuest: () => {
    const guestUser: User = {
      id: 'guest',
      username: 'Guest',
      email: '',
      created_at: new Date().toISOString(),
      rating_count: 0,
      restaurant_count: 0,
      average_score: 0,
      badges: [],
    };
    localStorage.setItem('cleancheck_user', JSON.stringify(guestUser));
    localStorage.setItem('cleancheck_onboarded', 'true');
    set({ user: guestUser, token: null, isAuthenticated: false });
  },
}));

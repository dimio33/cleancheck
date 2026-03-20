import { create } from 'zustand';
import type { User } from '../types';

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

  login: async (email: string, _password: string) => {
    // Mock login for now
    const mockUser: User = {
      id: '1',
      username: email.split('@')[0],
      email,
      created_at: new Date().toISOString(),
      rating_count: 12,
      restaurant_count: 8,
      average_score: 3.7,
      badges: [],
    };
    const mockToken = 'mock-jwt-token';
    localStorage.setItem('cleancheck_token', mockToken);
    localStorage.setItem('cleancheck_user', JSON.stringify(mockUser));
    set({ user: mockUser, token: mockToken, isAuthenticated: true });
  },

  register: async (username: string, email: string, _password: string) => {
    const mockUser: User = {
      id: '1',
      username,
      email,
      created_at: new Date().toISOString(),
      rating_count: 0,
      restaurant_count: 0,
      average_score: 0,
      badges: [],
    };
    const mockToken = 'mock-jwt-token';
    localStorage.setItem('cleancheck_token', mockToken);
    localStorage.setItem('cleancheck_user', JSON.stringify(mockUser));
    set({ user: mockUser, token: mockToken, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('cleancheck_token');
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

import { create } from 'zustand';
import api from '../services/api';

interface XpGain {
  amount: number;
  source: string;
}

interface GamificationState {
  xp: number;
  level: number;
  rank: string;
  streak: number;
  xpForNextLevel: number;
  xpProgress: number;
  levelUpPending: boolean;
  xpGains: XpGain[];
  loaded: boolean;
  activeFrame: string | null;
  fetchGamification: (userId: string) => Promise<void>;
  recordDailyLogin: (userId: string) => Promise<void>;
  setLevelUp: (v: boolean) => void;
  addXpGain: (amount: number, source: string) => void;
  clearXpGains: () => void;
}

export const useGamificationStore = create<GamificationState>((set) => ({
  xp: 0,
  level: 1,
  rank: 'newbie',
  streak: 0,
  xpForNextLevel: 100,
  xpProgress: 0,
  levelUpPending: false,
  xpGains: [],
  loaded: false,
  activeFrame: null,

  fetchGamification: async (userId: string) => {
    try {
      const { data } = await api.get(`/users/${userId}/profile`);
      const gamification = data.gamification || {};
      set({
        xp: gamification.xp ?? data.user?.xp ?? 0,
        level: gamification.level ?? data.user?.level ?? 1,
        rank: gamification.rank ?? data.user?.rank ?? 'newbie',
        streak: gamification.streak ?? data.user?.streak ?? 0,
        xpForNextLevel: gamification.xp_for_next_level ?? 100,
        xpProgress: gamification.xp_progress ?? 0,
        activeFrame: data.user?.active_frame || null,
        loaded: true,
      });
    } catch {
      // Silently fail — gamification is non-critical
      set({ loaded: true });
    }
  },

  recordDailyLogin: async (userId: string) => {
    try {
      const { data } = await api.post(`/users/${userId}/daily-login`);
      if (data.xp_awarded) {
        set((state) => ({
          xp: state.xp + (data.xp_amount || 15),
          xpGains: [...state.xpGains, { amount: data.xp_amount || 15, source: 'daily_login' }],
        }));
      }
    } catch {
      // Silently fail
    }
  },

  setLevelUp: (v: boolean) => set({ levelUpPending: v }),

  addXpGain: (amount: number, source: string) =>
    set((state) => ({
      xpGains: [...state.xpGains, { amount, source }],
    })),

  clearXpGains: () => set({ xpGains: [] }),
}));

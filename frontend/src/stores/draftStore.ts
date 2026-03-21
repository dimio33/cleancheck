import { create } from 'zustand';
import api from '../services/api';

interface RatingDraft {
  restaurantId: string;
  scores: { cleanliness: number; smell: number; supplies: number; maintenance: number; accessibility: number };
  comment?: string;
  lat: number;
  lng: number;
  timestamp: number;
}

interface DraftStore {
  drafts: RatingDraft[];
  addDraft: (draft: RatingDraft) => void;
  syncDrafts: () => Promise<number>;
  clearDrafts: () => void;
}

export const useDraftStore = create<DraftStore>((set, get) => ({
  drafts: (() => {
    try {
      return JSON.parse(localStorage.getItem('cleancheck_drafts') || '[]');
    } catch {
      return [];
    }
  })(),

  addDraft: (draft: RatingDraft) => {
    const next = [...get().drafts, draft];
    localStorage.setItem('cleancheck_drafts', JSON.stringify(next));
    set({ drafts: next });
  },

  syncDrafts: async () => {
    const { drafts } = get();
    if (drafts.length === 0) return 0;

    let synced = 0;
    const remaining: RatingDraft[] = [];

    for (const draft of drafts) {
      try {
        await api.post('/ratings', {
          restaurant_id: draft.restaurantId,
          cleanliness: draft.scores.cleanliness,
          smell: draft.scores.smell,
          supplies: draft.scores.supplies,
          condition: draft.scores.maintenance,
          accessibility: draft.scores.accessibility,
          comment: draft.comment || undefined,
          _loaded_at: draft.timestamp,
        }, {
          headers: {
            'X-User-Lat': String(draft.lat),
            'X-User-Lng': String(draft.lng),
          },
        });
        synced++;
      } catch {
        remaining.push(draft);
      }
    }

    localStorage.setItem('cleancheck_drafts', JSON.stringify(remaining));
    set({ drafts: remaining });
    return synced;
  },

  clearDrafts: () => {
    localStorage.removeItem('cleancheck_drafts');
    set({ drafts: [] });
  },
}));

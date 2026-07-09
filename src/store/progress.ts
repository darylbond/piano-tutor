import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Per-song progress, persisted on-device (PLAN §5.1). No servers: everything a
 * child earns lives in localStorage and can be exported/imported as a file to
 * move between devices.
 */
export interface SongProgress {
  /** Best star rating earned (0–3). */
  bestStars: number;
  /** Best accuracy 0–1. */
  bestAccuracy: number;
  /** Number of completed play-throughs. */
  plays: number;
  /** Epoch ms of the most recent play (stamped by the caller). */
  lastPlayed: number;
}

interface ProgressState {
  songs: Record<string, SongProgress>;
  /** Record a completed play; keeps the best of stars/accuracy. */
  recordPlay: (
    songId: string,
    result: { stars: number; accuracy: number },
    nowMs: number,
  ) => void;
  getProgress: (songId: string) => SongProgress | undefined;
  totalStars: () => number;
  /** Serialize all progress for the "export my progress" feature. */
  exportJson: () => string;
  importJson: (json: string) => boolean;
  reset: () => void;
}

const empty: SongProgress = {
  bestStars: 0,
  bestAccuracy: 0,
  plays: 0,
  lastPlayed: 0,
};

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      songs: {},

      recordPlay: (songId, result, nowMs) =>
        set((state) => {
          const prev = state.songs[songId] ?? empty;
          return {
            songs: {
              ...state.songs,
              [songId]: {
                bestStars: Math.max(prev.bestStars, result.stars),
                bestAccuracy: Math.max(prev.bestAccuracy, result.accuracy),
                plays: prev.plays + 1,
                lastPlayed: nowMs,
              },
            },
          };
        }),

      getProgress: (songId) => get().songs[songId],

      totalStars: () =>
        Object.values(get().songs).reduce((sum, p) => sum + p.bestStars, 0),

      exportJson: () => JSON.stringify({ version: 1, songs: get().songs }, null, 2),

      importJson: (json) => {
        try {
          const parsed = JSON.parse(json) as { songs?: Record<string, SongProgress> };
          if (!parsed.songs || typeof parsed.songs !== "object") return false;
          set({ songs: parsed.songs });
          return true;
        } catch {
          return false;
        }
      },

      reset: () => set({ songs: {} }),
    }),
    { name: "piano-tutor.progress", version: 1 },
  ),
);

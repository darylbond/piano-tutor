import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MusicView = "rain" | "sheet" | "combo";
export type PlayMode = "wait" | "rhythm";

interface SettingsState {
  /** Preferred visualization, remembered across sessions. */
  view: MusicView;
  /** Default scoring mode. */
  playMode: PlayMode;
  /** 0.5–1.0 tempo multiplier for play-along. */
  tempoScale: number;
  /** Whether note names are printed on the on-screen keyboard. */
  showKeyLabels: boolean;
  /** Master volume for built-in playback, 0–1. */
  volume: number;

  setView: (view: MusicView) => void;
  setPlayMode: (mode: PlayMode) => void;
  setTempoScale: (scale: number) => void;
  toggleKeyLabels: () => void;
  setVolume: (v: number) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      view: "rain",
      playMode: "wait",
      tempoScale: 1,
      showKeyLabels: true,
      volume: 0.8,

      setView: (view) => set({ view }),
      setPlayMode: (playMode) => set({ playMode }),
      setTempoScale: (tempoScale) =>
        set({ tempoScale: Math.min(1, Math.max(0.5, tempoScale)) }),
      toggleKeyLabels: () => set((s) => ({ showKeyLabels: !s.showKeyLabels })),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
    }),
    { name: "piano-tutor.settings", version: 1 },
  ),
);

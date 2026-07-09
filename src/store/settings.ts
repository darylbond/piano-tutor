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
  /** Mic onset sensitivity 0–1 (higher = triggers on quieter notes). */
  micSensitivity: number;
  /** Tuning offset in cents from calibration (acoustic pianos drift). */
  tuningCents: number;
  /** Whether the first-run mic calibration has been completed. */
  micCalibrated: boolean;

  setView: (view: MusicView) => void;
  setPlayMode: (mode: PlayMode) => void;
  setTempoScale: (scale: number) => void;
  toggleKeyLabels: () => void;
  setVolume: (v: number) => void;
  setMicSensitivity: (v: number) => void;
  setTuningCents: (c: number) => void;
  setMicCalibrated: (v: boolean) => void;
}

/** Map a 0–1 sensitivity to concrete RMS attack/release thresholds. */
export function sensitivityToThresholds(sensitivity: number): {
  attackThreshold: number;
  releaseThreshold: number;
} {
  const s = Math.min(1, Math.max(0, sensitivity));
  // High sensitivity -> low threshold (fires on quiet notes).
  const attackThreshold = 0.004 + (1 - s) * 0.05;
  return { attackThreshold, releaseThreshold: attackThreshold * 0.6 };
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      view: "rain",
      playMode: "wait",
      tempoScale: 1,
      showKeyLabels: true,
      volume: 0.8,
      micSensitivity: 0.5,
      tuningCents: 0,
      micCalibrated: false,

      setView: (view) => set({ view }),
      setPlayMode: (playMode) => set({ playMode }),
      setTempoScale: (tempoScale) =>
        set({ tempoScale: Math.min(1, Math.max(0.5, tempoScale)) }),
      toggleKeyLabels: () => set((s) => ({ showKeyLabels: !s.showKeyLabels })),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      setMicSensitivity: (micSensitivity) =>
        set({ micSensitivity: Math.min(1, Math.max(0, micSensitivity)) }),
      setTuningCents: (tuningCents) =>
        set({ tuningCents: Math.max(-100, Math.min(100, tuningCents)) }),
      setMicCalibrated: (micCalibrated) => set({ micCalibrated }),
    }),
    { name: "piano-tutor.settings", version: 3 },
  ),
);

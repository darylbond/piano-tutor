import type { NoteVerdict } from "./types";

/**
 * Turns a finished play-through into a friendly result: accuracy, a star rating,
 * and the measures that gave trouble (for "practice these bars" looping).
 *
 * Kept pure so it can be unit-tested and reused by both wait mode and the future
 * rhythm mode. Star thresholds are deliberately gentle — this is for 10-year-olds
 * and the goal is encouragement, not gatekeeping.
 */

export interface PlayResult {
  totalNotes: number;
  hits: number;
  close: number;
  missed: number;
  /** 0–1 accuracy (hits + half credit for close). */
  accuracy: number;
  /** 0–3 stars. */
  stars: number;
  /** Measures (1-based) with at least one non-hit, ascending. */
  trickyMeasures: number[];
}

export interface ScoredNote {
  verdict: NoteVerdict;
  measure: number;
}

export function scorePlaythrough(notes: ScoredNote[]): PlayResult {
  const totalNotes = notes.length;
  let hits = 0;
  let close = 0;
  let missed = 0;
  const tricky = new Set<number>();

  for (const n of notes) {
    if (n.verdict === "hit") hits++;
    else if (n.verdict === "close") {
      close++;
      tricky.add(n.measure);
    } else {
      missed++;
      tricky.add(n.measure);
    }
  }

  const accuracy = totalNotes === 0 ? 0 : (hits + close * 0.5) / totalNotes;
  return {
    totalNotes,
    hits,
    close,
    missed,
    accuracy,
    stars: starsForAccuracy(accuracy),
    trickyMeasures: [...tricky].sort((a, b) => a - b),
  };
}

/** Gentle thresholds: finishing at all earns a star. */
export function starsForAccuracy(accuracy: number): number {
  if (accuracy >= 0.95) return 3;
  if (accuracy >= 0.8) return 2;
  if (accuracy > 0) return 1;
  return 0;
}

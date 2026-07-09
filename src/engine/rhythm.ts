import type { ScoreNote, NoteEvent, NoteVerdict } from "./types";
import { samePitchClass, beatsToMs } from "./music";

/**
 * Rhythm-mode matching (PLAN §2.2 / §5.3).
 *
 * Unlike wait mode, the clock never stops: each expected note has a target time
 * and timing windows. A heard event is matched to the nearest unplayed expected
 * note of the right pitch within the "good" window; the error decides hit vs
 * close. Notes whose window fully passes with nothing played are missed. Pure
 * and time-injected so it unit-tests without audio or a real clock.
 */

export interface RhythmOptions {
  /** ±ms for a "perfect" hit. */
  perfectMs: number;
  /** ±ms for a "close" hit; beyond this the event can't claim the note. */
  goodMs: number;
  octaveForgiving: boolean;
}

export const DEFAULT_RHYTHM: RhythmOptions = {
  perfectMs: 130,
  goodMs: 280,
  octaveForgiving: true,
};

interface Expected {
  note: ScoreNote;
  targetMs: number;
  matched: boolean;
  verdict: NoteVerdict;
}

export class RhythmMatcher {
  private expected: Expected[];
  private opts: RhythmOptions;

  constructor(notes: ScoreNote[], bpm: number, opts: RhythmOptions = DEFAULT_RHYTHM) {
    this.opts = opts;
    this.expected = notes
      .map((note) => ({
        note,
        targetMs: beatsToMs(note.startBeat, bpm),
        matched: false,
        verdict: "pending" as NoteVerdict,
      }))
      .sort((a, b) => a.targetMs - b.targetMs);
  }

  private pitchOk(expectedMidi: number, heardMidi: number): boolean {
    if (heardMidi === expectedMidi) return true;
    return this.opts.octaveForgiving && samePitchClass(heardMidi, expectedMidi);
  }

  /**
   * Match a heard note played at `nowMs`. Returns the resulting verdict, or null
   * if nothing plausible matched (an extra note). Chooses the nearest-in-time
   * unmatched expected note of the right pitch inside the good window.
   */
  handleEvent(heard: NoteEvent, nowMs: number): NoteVerdict | null {
    let best: Expected | null = null;
    let bestErr = Infinity;
    for (const e of this.expected) {
      if (e.matched) continue;
      if (!this.pitchOk(e.note.midi, heard.midi)) continue;
      const err = Math.abs(nowMs - e.targetMs);
      if (err <= this.opts.goodMs && err < bestErr) {
        best = e;
        bestErr = err;
      }
    }
    if (!best) return null;
    best.matched = true;
    best.verdict = bestErr <= this.opts.perfectMs ? "hit" : "close";
    return best.verdict;
  }

  /** Mark notes whose good-window has fully elapsed as missed. */
  update(nowMs: number) {
    for (const e of this.expected) {
      if (!e.matched && e.verdict === "pending" && nowMs > e.targetMs + this.opts.goodMs) {
        e.verdict = "missed";
      }
    }
  }

  getVerdicts(): Map<number, NoteVerdict> {
    return new Map(this.expected.map((e) => [e.note.id, e.verdict]));
  }

  /** True once every note has a final verdict. */
  isComplete(): boolean {
    return this.expected.every((e) => e.verdict !== "pending");
  }
}

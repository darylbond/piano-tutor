import type { ScoreNote, NoteEvent, NoteVerdict } from "./types";
import { samePitchClass } from "./music";

/**
 * Wait-mode matching (PLAN §5.3).
 *
 * Wait mode is the untimed, impossible-to-fail default: the playhead parks on the
 * next expected note until the student plays it, then advances. This module holds
 * the pure decision logic so it can be unit-tested without audio or a clock.
 */

export interface MatchOptions {
  /** Accept any octave of the right pitch class (kid-forgiving default). */
  octaveForgiving: boolean;
}

export const DEFAULT_MATCH: MatchOptions = { octaveForgiving: true };

/** Does a heard event satisfy the expected note? */
export function noteMatches(
  expected: ScoreNote,
  heard: NoteEvent,
  opts: MatchOptions = DEFAULT_MATCH,
): boolean {
  if (heard.midi === expected.midi) return true;
  if (opts.octaveForgiving) return samePitchClass(heard.midi, expected.midi);
  return false;
}

/**
 * Tracks progress through a song in wait mode. Notes that begin on the same beat
 * (a chord) are grouped into one "step"; the step clears once every note in it
 * has been played. Feed live events in; read the cursor and per-note verdicts out.
 */
export class WaitModeMatcher {
  private steps: ScoreNote[][];
  private stepIndex = 0;
  /** scoreNoteId -> whether it has been satisfied within the current step. */
  private satisfied = new Set<number>();
  private verdicts = new Map<number, NoteVerdict>();
  private opts: MatchOptions;
  /** True if any wrong key was pressed while on the current step. */
  private fumbledCurrentStep = false;
  /** Total wrong key presses across the whole run, for the report. */
  private wrongCount = 0;

  constructor(notes: ScoreNote[], opts: MatchOptions = DEFAULT_MATCH) {
    this.opts = opts;
    this.steps = groupIntoSteps(notes);
    for (const n of notes) this.verdicts.set(n.id, "pending");
  }

  /** The notes the student must currently play (empty when finished). */
  currentStep(): ScoreNote[] {
    return this.steps[this.stepIndex] ?? [];
  }

  isComplete(): boolean {
    return this.stepIndex >= this.steps.length;
  }

  /** Beat position the cursor should sit at (start of the current step). */
  cursorBeat(): number {
    const step = this.currentStep();
    return step.length ? step[0].startBeat : Number.POSITIVE_INFINITY;
  }

  getVerdicts(): Map<number, NoteVerdict> {
    return this.verdicts;
  }

  /** How many wrong keys the student has pressed this run. */
  getWrongCount(): number {
    return this.wrongCount;
  }

  /**
   * Process one heard note. Returns true if it advanced the cursor to a new step
   * (i.e. the current step just completed), so the caller can play a chime.
   *
   * A press that matches no note in the current step is a wrong press: it's
   * counted, and it marks the step "fumbled" so the note earns partial credit
   * ("close") rather than a clean "hit" — otherwise finishing would always score
   * 100% no matter how many wrong keys were mashed.
   */
  handleEvent(heard: NoteEvent): boolean {
    if (this.isComplete()) return false;
    const step = this.currentStep();

    let matchedSomething = false;
    for (const note of step) {
      if (this.satisfied.has(note.id)) continue;
      if (noteMatches(note, heard, this.opts)) {
        this.satisfied.add(note.id);
        matchedSomething = true;
        break; // one heard note satisfies at most one expected note
      }
    }
    if (!matchedSomething) {
      this.wrongCount++;
      this.fumbledCurrentStep = true;
      return false;
    }

    // Advance when every note in the step has been satisfied.
    const allDone = step.every((n) => this.satisfied.has(n.id));
    if (allDone) {
      const verdict: NoteVerdict = this.fumbledCurrentStep ? "close" : "hit";
      for (const n of step) this.verdicts.set(n.id, verdict);
      this.stepIndex++;
      this.satisfied.clear();
      this.fumbledCurrentStep = false;
      return true;
    }
    return false;
  }

  reset() {
    this.stepIndex = 0;
    this.satisfied.clear();
    this.fumbledCurrentStep = false;
    this.wrongCount = 0;
    for (const id of this.verdicts.keys()) this.verdicts.set(id, "pending");
  }
}

/** Group notes sharing a start beat into ordered steps (chords = one step). */
export function groupIntoSteps(notes: ScoreNote[]): ScoreNote[][] {
  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);
  const steps: ScoreNote[][] = [];
  let current: ScoreNote[] = [];
  let currentBeat = Number.NaN;

  for (const note of sorted) {
    if (current.length === 0 || Math.abs(note.startBeat - currentBeat) < 1e-6) {
      current.push(note);
      currentBeat = current[0].startBeat;
    } else {
      steps.push(current);
      current = [note];
      currentBeat = note.startBeat;
    }
  }
  if (current.length) steps.push(current);
  return steps;
}

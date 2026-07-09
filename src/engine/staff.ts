/**
 * Pure music-notation geometry: where a note sits on a staff, and whether it
 * needs a sharp. Kept separate from any rendering so the tricky pitch → vertical
 * position mapping is unit-testable (the part most likely to be subtly wrong).
 *
 * We use a single treble staff with ledger lines — simple and readable for kids.
 * Positions are measured in "diatonic steps" from the bottom staff line (E4),
 * where each step is half the gap between two staff lines. Higher pitch = higher
 * on the staff = larger step number.
 */

// Diatonic index within an octave for each letter (C=0 … B=6).
const LETTER_INDEX = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // by semitone within octave
const IS_SHARP = [false, true, false, true, false, false, true, false, true, false, true, false];

/** Absolute diatonic index of a MIDI note (C4 = 4*7 + 0 = 28). */
export function diatonicIndex(midi: number): number {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = ((midi % 12) + 12) % 12;
  return octave * 7 + LETTER_INDEX[semitone];
}

/** Does this MIDI note render with a sharp accidental? */
export function needsSharp(midi: number): boolean {
  return IS_SHARP[((midi % 12) + 12) % 12];
}

// Reference: bottom line of the treble staff is E4.
const BOTTOM_LINE_MIDI = 64; // E4
const BOTTOM_LINE_DIATONIC = diatonicIndex(BOTTOM_LINE_MIDI);

/**
 * Vertical position of a note in half-step units above the bottom staff line.
 * 0 = on the bottom line (E4); 1 = first space (F4); 2 = second line (G4)…
 * Negative = below the staff (needs ledger lines).
 */
export function staffStep(midi: number): number {
  return diatonicIndex(midi) - BOTTOM_LINE_DIATONIC;
}

/** The five treble staff lines as half-step positions: 0,2,4,6,8. */
export const STAFF_LINES = [0, 2, 4, 6, 8];

/**
 * Ledger-line positions needed for a note at the given staff step, as an array
 * of even half-step values between the staff and the note (exclusive of staff).
 * e.g. middle C (step -2) needs one ledger line at -2.
 */
export function ledgerLines(step: number): number[] {
  const lines: number[] = [];
  if (step < 0) {
    for (let s = -2; s >= step; s -= 2) lines.push(s);
  } else if (step > 8) {
    for (let s = 10; s <= step; s += 2) lines.push(s);
  }
  return lines;
}

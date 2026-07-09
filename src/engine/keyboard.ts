import { isWhiteKey } from "./music";

/**
 * Geometry for drawing a piano keyboard and mapping MIDI notes to x-positions.
 * White keys tile evenly; black keys sit at fractional offsets between them.
 * All positions are normalized 0–1 across the given range, so the same layout
 * scales to any canvas width.
 */
export interface KeyLayout {
  midi: number;
  white: boolean;
  /** Left edge (0–1) of the key's hit area. */
  x: number;
  /** Width (0–1) of the key. */
  w: number;
  /** Center x (0–1) — where a falling note should aim. */
  cx: number;
}

export interface KeyboardRange {
  lowMidi: number;
  highMidi: number;
  keys: KeyLayout[];
  whiteCount: number;
}

/** Build a keyboard layout spanning [lowMidi, highMidi] inclusive. */
export function buildKeyboard(lowMidi: number, highMidi: number): KeyboardRange {
  // Ensure we start and end on white keys so the board looks natural.
  while (!isWhiteKey(lowMidi)) lowMidi--;
  while (!isWhiteKey(highMidi)) highMidi++;

  const whites: number[] = [];
  for (let m = lowMidi; m <= highMidi; m++) {
    if (isWhiteKey(m)) whites.push(m);
  }
  const whiteCount = whites.length;
  const whiteW = 1 / whiteCount;

  // Map each white key to its slot index for positioning black keys between them.
  const whiteIndex = new Map<number, number>();
  whites.forEach((m, i) => whiteIndex.set(m, i));

  const keys: KeyLayout[] = [];

  // White keys first (drawn underneath).
  for (const m of whites) {
    const i = whiteIndex.get(m)!;
    const x = i * whiteW;
    keys.push({ midi: m, white: true, x, w: whiteW, cx: x + whiteW / 2 });
  }

  // Black keys: positioned at the boundary between their lower white neighbor
  // and the next, narrower and centered on that seam.
  const blackW = whiteW * 0.62;
  for (let m = lowMidi; m <= highMidi; m++) {
    if (isWhiteKey(m)) continue;
    const lowerWhite = m - 1; // black keys always sit just above a white key
    const i = whiteIndex.get(lowerWhite);
    if (i === undefined) continue;
    const seam = (i + 1) * whiteW; // boundary between white i and i+1
    const x = seam - blackW / 2;
    keys.push({ midi: m, white: false, x, w: blackW, cx: seam });
  }

  return { lowMidi, highMidi, keys, whiteCount };
}

/** Center x (0–1) for a given midi note within a prebuilt keyboard. */
export function keyCenter(kb: KeyboardRange, midi: number): number | null {
  const k = kb.keys.find((key) => key.midi === midi);
  return k ? k.cx : null;
}

/** A comfortable default range for beginner songs: C3–C6 (three octaves). */
export const DEFAULT_RANGE = { low: 48, high: 84 };

/** Small, dependency-free music-theory helpers shared across the app. */

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const WHITE_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);

/** MIDI note number → name with octave, e.g. 60 → "C4". */
export function midiToName(midi: number): string {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

/** Letter only, no octave, e.g. 61 → "C#". */
export function midiToPitchClassName(midi: number): string {
  return NOTE_NAMES[((midi % 12) + 12) % 12];
}

/** True for the white keys of a piano. */
export function isWhiteKey(midi: number): boolean {
  return WHITE_PITCH_CLASSES.has(((midi % 12) + 12) % 12);
}

/** True when two notes share a pitch class (octave-insensitive match). */
export function samePitchClass(a: number, b: number): boolean {
  return (((a - b) % 12) + 12) % 12 === 0;
}

/** Convert a beat position to milliseconds at a given tempo. */
export function beatsToMs(beats: number, bpm: number): number {
  return (beats / bpm) * 60_000;
}

/** Convert milliseconds to a beat position at a given tempo. */
export function msToBeats(ms: number, bpm: number): number {
  return (ms / 60_000) * bpm;
}

/** Equal-temperament frequency (Hz) of a MIDI note; A4 (69) = 440 Hz. */
export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Nearest MIDI note to a frequency, plus cents deviation for tuning feedback. */
export function freqToMidi(freq: number): { midi: number; cents: number } {
  const exact = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(exact);
  const cents = Math.round((exact - midi) * 100);
  return { midi, cents };
}

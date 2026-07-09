import type { Song, ScoreNote } from "@/engine/types";

/**
 * Exercise generators (PLAN §2.1 Practice). Each returns a `Song`, so exercises
 * play through the exact same Note Rain + wait-mode + scoring surface as library
 * songs — no separate engine. They're addressed by ids prefixed "exercise-", and
 * the catalog loader recognizes that prefix instead of fetching a file.
 *
 * Everything here is generated from music theory (scales, arpeggios, chord
 * shapes, finger patterns) — deterministic and unambiguous, not transcribed.
 */

export interface ExerciseMeta {
  id: string;
  title: string;
  blurb: string;
  emoji: string;
  /** 1 (warm-up) … 5 (advanced), used to group the Practice screen. */
  level: number;
}

const EXERCISE_PREFIX = "exercise-";

export function isExerciseId(id: string): boolean {
  return id.startsWith(EXERCISE_PREFIX);
}

/** Build ScoreNotes from a list of midis with a fixed duration each. */
function sequence(midis: number[], durBeats: number, beatsPerMeasure: number): ScoreNote[] {
  let beat = 0;
  return midis.map((midi, id) => {
    const note: ScoreNote = {
      id,
      midi,
      startBeat: beat,
      durBeats,
      hand: "right",
      measure: Math.floor(beat / beatsPerMeasure) + 1,
    };
    beat += durBeats;
    return note;
  });
}

function makeSong(
  id: string,
  title: string,
  midis: number[],
  opts: { bpm?: number; durBeats?: number; blurb?: string; level?: number } = {},
): Song {
  const bpm = opts.bpm ?? 90;
  const durBeats = opts.durBeats ?? 1;
  const beatsPerMeasure = 4;
  return {
    id,
    title,
    composer: "Practice",
    level: opts.level ?? 1,
    bpm,
    beatsPerMeasure,
    hands: ["right"],
    license: "MIT",
    attribution: "Original exercise © Piano Tutor, MIT.",
    blurb: opts.blurb,
    notes: sequence(midis, durBeats, beatsPerMeasure),
  };
}

// ── Note-pattern building blocks (semitone offsets from a root). ──────────────
const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12];
const NAT_MINOR = [0, 2, 3, 5, 7, 8, 10, 12];
const HARM_MINOR = [0, 2, 3, 5, 7, 8, 11, 12];
const PENTA_MAJOR = [0, 2, 4, 7, 9, 12];
const FIVE_FINGER = [0, 2, 4, 5, 7];
const MAJOR_TRIAD = [0, 4, 7, 12];
const MINOR_TRIAD = [0, 3, 7, 12];

/** Play a set of offsets up from root, then back down (without repeating top). */
function upDown(offsets: number[], root: number): number[] {
  const up = offsets.map((s) => root + s);
  return [...up, ...[...up].reverse().slice(1)];
}

function twoOctave(offsets: number[], root: number): number[] {
  const oneUp = offsets.map((s) => root + s);
  const twoUp = offsets.slice(1).map((s) => root + 12 + s);
  const up = [...oneUp, ...twoUp];
  return [...up, ...[...up].reverse().slice(1)];
}

function chromatic(root: number, semis: number): number[] {
  const up = Array.from({ length: semis + 1 }, (_, i) => root + i);
  return [...up, ...[...up].reverse().slice(1)];
}

/** Midi for a C-major scale-degree index (0 = C4, 7 = C5, negative allowed). */
function cDegree(i: number): number {
  const d = [0, 2, 4, 5, 7, 9, 11];
  const oct = Math.floor(i / 7);
  const step = ((i % 7) + 7) % 7;
  return 60 + 12 * oct + d[step];
}

/** Diatonic broken thirds up the C-major scale: C E, D F, E G … */
function brokenThirds(): number[] {
  const out: number[] = [];
  for (let i = 0; i <= 7; i++) out.push(cDegree(i), cDegree(i + 2));
  return out;
}

/** Alberti bass cell (low–high–middle–high) over one triad, repeated. */
function alberti(root: number, cells: number): number[] {
  const cell = [0, 7, 4, 7];
  const out: number[] = [];
  for (let i = 0; i < cells; i++) out.push(...cell.map((s) => root + s));
  return out;
}

/** Broken triads through a I–IV–V–I progression in C. */
function brokenChordProgression(): number[] {
  const chords = [
    [60, 64, 67], // C
    [65, 69, 72], // F
    [67, 71, 74], // G
    [60, 64, 67], // C
  ];
  return chords.flatMap((c) => [...c, ...[...c].reverse().slice(1)]);
}

/** Hanon-style finger pattern: a 6-note cell shifted up each scale degree. */
function hanon(): number[] {
  const cell = [0, 2, 3, 4, 5, 4, 3, 2]; // scale-degree offsets
  const out: number[] = [];
  for (let start = 0; start <= 6; start++) out.push(...cell.map((c) => cDegree(start + c)));
  for (let start = 7; start >= 0; start--) out.push(cDegree(start)); // resolve down the scale
  return out;
}

/** Rapid two-note alternation (a trill), n back-and-forths ending on a. */
function trill(a: number, b: number, pairs: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < pairs; i++) out.push(a, b);
  out.push(a);
  return out;
}

/** C-major scale in octaves: each scale note then the note an octave up. */
function octaves(): number[] {
  const up: number[] = [];
  for (const s of MAJOR) up.push(60 + s, 72 + s);
  return up;
}

interface ExerciseDef extends ExerciseMeta {
  build: () => Song;
}

// Small helper to cut down on repetition when defining a note-list exercise.
function ex(
  id: string,
  title: string,
  emoji: string,
  level: number,
  blurb: string,
  midis: number[],
  opts: { bpm?: number; durBeats?: number } = {},
): ExerciseDef {
  return {
    id: `${EXERCISE_PREFIX}${id}`,
    title,
    blurb,
    emoji,
    level,
    build: () =>
      makeSong(`${EXERCISE_PREFIX}${id}`, title, midis, { ...opts, blurb, level }),
  };
}

const DEFS: ExerciseDef[] = [
  // ── Level 1 · Warm-ups ─────────────────────────────────────────────────────
  ex("five-finger-c", "Five-Finger Warm-Up (C)", "🖐️", 1,
    "C D E F G and back — one finger per key.", upDown(FIVE_FINGER, 60), { bpm: 80 }),
  ex("five-finger-g", "Five-Finger Warm-Up (G)", "🖐️", 1,
    "Same shape, starting on G.", upDown(FIVE_FINGER, 67), { bpm: 80 }),
  ex("five-finger-f", "Five-Finger Warm-Up (F)", "🖐️", 1,
    "Same shape, starting on F.", upDown(FIVE_FINGER, 65), { bpm: 80 }),
  ex("five-finger-d", "Five-Finger Warm-Up (D)", "🖐️", 1,
    "Same shape, starting on D.", upDown(FIVE_FINGER, 62), { bpm: 80 }),
  ex("skips-c", "Skipping Notes", "🐰", 1,
    "Jump over a key each time: C E G E C.", [60, 64, 67, 64, 60, 65, 69, 65, 60], { bpm: 72 }),
  ex("pentatonic-c", "Pentatonic Path", "🌸", 1,
    "Five happy notes — no wrong turns!", upDown(PENTA_MAJOR, 60), { bpm: 84 }),

  // ── Level 2 · Major scales (one octave) ────────────────────────────────────
  ex("c-major-scale", "C Major Scale", "🎼", 2,
    "Up and down the whole scale.", upDown(MAJOR, 60), { bpm: 84 }),
  ex("g-major-scale", "G Major Scale", "🎼", 2,
    "One sharp — watch for F#!", upDown(MAJOR, 67), { bpm: 84 }),
  ex("d-major-scale", "D Major Scale", "🎼", 2,
    "Two sharps: F# and C#.", upDown(MAJOR, 62), { bpm: 84 }),
  ex("f-major-scale", "F Major Scale", "🎼", 2,
    "One flat — B becomes B♭.", upDown(MAJOR, 65), { bpm: 84 }),
  ex("a-major-scale", "A Major Scale", "🎼", 2,
    "Three sharps — a bright key.", upDown(MAJOR, 69), { bpm: 84 }),

  // ── Level 3 · Minor scales & arpeggios ─────────────────────────────────────
  ex("a-minor-scale", "A Minor Scale", "🌙", 3,
    "The natural minor — all white keys from A.", upDown(NAT_MINOR, 69), { bpm: 84 }),
  ex("e-minor-scale", "E Minor Scale", "🌙", 3,
    "Minor with one sharp (F#).", upDown(NAT_MINOR, 64), { bpm: 84 }),
  ex("d-minor-scale", "D Minor Scale", "🌙", 3,
    "Minor with one flat (B♭).", upDown(NAT_MINOR, 62), { bpm: 84 }),
  ex("arpeggio-c", "C Major Arpeggio", "🎯", 3,
    "Skip through the chord: C E G C.", upDown(MAJOR_TRIAD, 60), { bpm: 80 }),
  ex("arpeggio-g", "G Major Arpeggio", "🎯", 3,
    "The G chord, spread out.", upDown(MAJOR_TRIAD, 67), { bpm: 80 }),
  ex("arpeggio-a-minor", "A Minor Arpeggio", "🎯", 3,
    "A minor chord: A C E A.", upDown(MINOR_TRIAD, 69), { bpm: 80 }),
  ex("broken-chords", "Chord Journey (C F G C)", "🧭", 3,
    "Roll through four chords, one at a time.", brokenChordProgression(), { bpm: 80 }),

  // ── Level 4 · Patterns ─────────────────────────────────────────────────────
  ex("broken-thirds-c", "Thirds Ladder", "🪜", 4,
    "Two-note steps climbing the scale.", brokenThirds(), { bpm: 80, durBeats: 0.5 }),
  ex("alberti-c", "Alberti Bass", "🌊", 4,
    "The rippling accompaniment pattern.", alberti(48, 6), { bpm: 96, durBeats: 0.5 }),
  ex("two-octave-c", "C Major — Two Octaves", "⛰️", 4,
    "The full scale, C to C to C.", twoOctave(MAJOR, 60), { bpm: 92, durBeats: 0.5 }),
  ex("chromatic-c", "Chromatic Climb", "🐍", 4,
    "Every key, black and white, in a row.", chromatic(60, 12), { bpm: 88, durBeats: 0.5 }),
  ex("a-harmonic-minor", "A Harmonic Minor", "🕯️", 4,
    "Minor with a dramatic raised 7th (G#).", upDown(HARM_MINOR, 69), { bpm: 84 }),

  // ── Level 5 · Advanced ─────────────────────────────────────────────────────
  ex("hanon-1", "Finger Power (Hanon No. 1)", "💪", 5,
    "The classic finger-independence workout.", hanon(), { bpm: 92, durBeats: 0.5 }),
  ex("two-octave-g", "G Major — Two Octaves", "⛰️", 5,
    "Two octaves with F# throughout.", twoOctave(MAJOR, 67), { bpm: 96, durBeats: 0.5 }),
  ex("octaves-c", "Octave Jumps", "🦘", 5,
    "Leap an octave on every scale note.", octaves(), { bpm: 84 }),
  ex("trill-cd", "Trill Drill", "🐦", 5,
    "Fast, even alternation between two notes.", trill(60, 62, 12), { bpm: 100, durBeats: 0.5 }),
];

export function listExercises(): ExerciseMeta[] {
  return DEFS.map(({ id, title, blurb, emoji, level }) => ({ id, title, blurb, emoji, level }));
}

export function getExercise(id: string): Song | null {
  return DEFS.find((d) => d.id === id)?.build() ?? null;
}

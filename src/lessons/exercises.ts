import type { Song, ScoreNote } from "@/engine/types";

/**
 * Exercise generators (PLAN §2.1 Practice). Each returns a `Song`, so exercises
 * play through the exact same Note Rain + wait-mode + scoring surface as library
 * songs — no separate engine. They're addressed by ids prefixed "exercise-", and
 * the catalog loader recognizes that prefix instead of fetching a file.
 */

export interface ExerciseMeta {
  id: string;
  title: string;
  blurb: string;
  emoji: string;
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
  opts: { bpm?: number; durBeats?: number; blurb?: string } = {},
): Song {
  const bpm = opts.bpm ?? 90;
  const durBeats = opts.durBeats ?? 1;
  const beatsPerMeasure = 4;
  return {
    id,
    title,
    composer: "Practice",
    level: 1,
    bpm,
    beatsPerMeasure,
    hands: ["right"],
    license: "MIT",
    attribution: "Original exercise © Piano Tutor, MIT.",
    blurb: opts.blurb,
    notes: sequence(midis, durBeats, beatsPerMeasure),
  };
}

// Scale/interval building blocks (C major unless noted). Middle C = 60.
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11, 12];

function majorScale(root: number): number[] {
  const up = MAJOR_STEPS.map((s) => root + s);
  const down = [...up].reverse().slice(1);
  return [...up, ...down];
}

function fiveFinger(root: number): number[] {
  const up = [0, 2, 4, 5, 7].map((s) => root + s);
  const down = [...up].reverse().slice(1);
  return [...up, ...down];
}

interface ExerciseDef extends ExerciseMeta {
  build: () => Song;
}

const DEFS: ExerciseDef[] = [
  {
    id: "exercise-five-finger-c",
    title: "Five-Finger Warm-Up (C)",
    blurb: "C D E F G and back — one finger per key.",
    emoji: "🖐️",
    build: () =>
      makeSong("exercise-five-finger-c", "Five-Finger Warm-Up (C)", fiveFinger(60), {
        bpm: 80,
        blurb: "C D E F G and back — one finger per key.",
      }),
  },
  {
    id: "exercise-five-finger-g",
    title: "Five-Finger Warm-Up (G)",
    blurb: "Same shape, starting on G.",
    emoji: "🖐️",
    build: () =>
      makeSong("exercise-five-finger-g", "Five-Finger Warm-Up (G)", fiveFinger(67), {
        bpm: 80,
        blurb: "Same shape, starting on G.",
      }),
  },
  {
    id: "exercise-c-major-scale",
    title: "C Major Scale",
    blurb: "Up and down the whole scale.",
    emoji: "🎼",
    build: () =>
      makeSong("exercise-c-major-scale", "C Major Scale", majorScale(60), {
        bpm: 84,
        blurb: "Up and down the whole scale.",
      }),
  },
  {
    id: "exercise-g-major-scale",
    title: "G Major Scale",
    blurb: "One sharp — watch for F#!",
    emoji: "🎼",
    build: () =>
      makeSong("exercise-g-major-scale", "G Major Scale", majorScale(67), {
        bpm: 84,
        blurb: "One sharp — watch for F#!",
      }),
  },
  {
    id: "exercise-skips-c",
    title: "Skipping Notes",
    blurb: "Jump over a key each time: C E G E C.",
    emoji: "🐰",
    build: () =>
      makeSong(
        "exercise-skips-c",
        "Skipping Notes",
        [60, 64, 67, 64, 60, 65, 69, 65, 60],
        { bpm: 72, blurb: "Jump over a key each time." },
      ),
  },
];

export function listExercises(): ExerciseMeta[] {
  return DEFS.map(({ id, title, blurb, emoji }) => ({ id, title, blurb, emoji }));
}

export function getExercise(id: string): Song | null {
  return DEFS.find((d) => d.id === id)?.build() ?? null;
}

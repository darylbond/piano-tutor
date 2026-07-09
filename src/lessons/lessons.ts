/**
 * Data-driven lessons (PLAN §2.1 Learn). A lesson is a short sequence of steps:
 * a "say" step teaches one idea; interactive steps ("find" a key, or "play" a
 * short sequence) check understanding. The LessonRunner interprets this data, so
 * adding a lesson is pure content — no new UI code.
 */

export type LessonStep =
  | { kind: "say"; emoji: string; text: string }
  | { kind: "find"; midi: number; text: string; done: string }
  | { kind: "play"; midis: number[]; text: string; done: string };

export interface Lesson {
  id: string;
  title: string;
  emoji: string;
  blurb: string;
  /** Keyboard range shown for interactive steps. */
  lowMidi: number;
  highMidi: number;
  steps: LessonStep[];
}

const C4 = 60;
const D4 = 62;
const E4 = 64;
const F4 = 65;
const G4 = 67;

export const LESSONS: Lesson[] = [
  {
    id: "meet-the-piano",
    title: "Meet the Piano",
    emoji: "🎹",
    blurb: "Where the notes live.",
    lowMidi: 60,
    highMidi: 72,
    steps: [
      {
        kind: "say",
        emoji: "🎹",
        text: "This is a piano keyboard! Low notes are on the left, and they get higher as you go right.",
      },
      {
        kind: "say",
        emoji: "🔤",
        text: "The white keys have letter names: C, D, E, F, G, A, B — then they repeat!",
      },
      {
        kind: "say",
        emoji: "👀",
        text: "See the black keys in groups of two and three? The white key just left of the TWO black keys is always C.",
      },
      {
        kind: "find",
        midi: C4,
        text: "Your turn! Tap the C key (just left of the two black keys).",
        done: "That's C! You found it! 🎉",
      },
    ],
  },
  {
    id: "first-three-notes",
    title: "Your First Notes",
    emoji: "🌱",
    blurb: "Play C, D, and E.",
    lowMidi: 60,
    highMidi: 72,
    steps: [
      {
        kind: "say",
        emoji: "👉",
        text: "The first three white keys are C, D, E. Let's play them one at a time.",
      },
      {
        kind: "find",
        midi: C4,
        text: "First, tap C.",
        done: "Nice!",
      },
      {
        kind: "play",
        midis: [C4, D4, E4],
        text: "Now play them in order: C, then D, then E.",
        done: "You played your first tune! 🌟",
      },
    ],
  },
  {
    id: "going-up",
    title: "Going Up",
    emoji: "🪜",
    blurb: "Step up five notes.",
    lowMidi: 60,
    highMidi: 72,
    steps: [
      {
        kind: "say",
        emoji: "🪜",
        text: "When you play the white keys in a row, it sounds like climbing stairs. Let's climb!",
      },
      {
        kind: "play",
        midis: [C4, D4, E4, F4, G4],
        text: "Play C, D, E, F, G — one step at a time going up.",
        done: "Up you go! 🎉",
      },
      {
        kind: "play",
        midis: [G4, F4, E4, D4, C4],
        text: "Now come back down: G, F, E, D, C.",
        done: "You can go up AND down! ⭐",
      },
    ],
  },
  {
    id: "c-major-scale",
    title: "The C Major Scale",
    emoji: "🎼",
    blurb: "All eight notes!",
    lowMidi: 60,
    highMidi: 72,
    steps: [
      {
        kind: "say",
        emoji: "🎼",
        text: "A scale is eight notes in a row. The C major scale is all white keys from C to the next C!",
      },
      {
        kind: "play",
        midis: [60, 62, 64, 65, 67, 69, 71, 72],
        text: "Play every white key from C up to the next C.",
        done: "That's a whole scale! You're a real musician! 🏆",
      },
    ],
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

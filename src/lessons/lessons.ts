/**
 * Data-driven lessons (PLAN §2.1 Learn). A lesson is a short sequence of steps:
 * a "say" step teaches one idea; interactive steps ("find" a key, or "play" a
 * short sequence) check understanding. The LessonRunner interprets this data, so
 * adding a lesson is pure content — no new UI code.
 */

export type LessonStep =
  | { kind: "say"; emoji: string; text: string }
  | { kind: "find"; midi: number; text: string; done: string }
  | { kind: "play"; midis: number[]; text: string; done: string }
  // Press every note of a chord together (in any order).
  | { kind: "chord"; midis: number[]; text: string; done: string };

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

const C3 = 48;
const C4 = 60;
const D4 = 62;
const Eb4 = 63;
const E4 = 64;
const F4 = 65;
const Fs4 = 66;
const G4 = 67;
const A4 = 69;
const Bb4 = 70;
const B4 = 71;
const C5 = 72;
const D5 = 74;

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
  {
    id: "the-musical-alphabet",
    title: "The Musical Alphabet",
    emoji: "🔤",
    blurb: "Only seven letters!",
    lowMidi: 60,
    highMidi: 72,
    steps: [
      {
        kind: "say",
        emoji: "🔤",
        text: "Music uses only seven letters: A B C D E F G. After G, it starts again at A — over and over up the keyboard.",
      },
      {
        kind: "say",
        emoji: "👀",
        text: "Each white key has one of those letters. Once you know where C is, you can count up to any note.",
      },
      {
        kind: "find",
        midi: A4,
        text: "Count up from C: C, D, E, F, G, A — tap that A.",
        done: "You found A! 🎉",
      },
    ],
  },
  {
    id: "finding-middle-c",
    title: "Finding Middle C",
    emoji: "🎯",
    blurb: "Your home base.",
    lowMidi: 48,
    highMidi: 72,
    steps: [
      {
        kind: "say",
        emoji: "🏠",
        text: "Middle C sits near the middle of the piano. It's your home base — most tunes start close to it.",
      },
      {
        kind: "say",
        emoji: "👀",
        text: "Look for the two black keys nearest the middle. The white key just to their left is Middle C.",
      },
      {
        kind: "find",
        midi: C4,
        text: "Tap Middle C (left of the middle pair of black keys).",
        done: "Home base found! 🏡",
      },
    ],
  },
  {
    id: "steps-and-skips",
    title: "Steps and Skips",
    emoji: "🐾",
    blurb: "Move by 1 or by 2.",
    lowMidi: 60,
    highMidi: 72,
    steps: [
      {
        kind: "say",
        emoji: "🐾",
        text: "A STEP moves to the very next white key. A SKIP hops over one key. Melodies are built from both!",
      },
      {
        kind: "play",
        midis: [C4, D4, E4],
        text: "Play three steps in a row: C, D, E.",
        done: "Those were steps! 👣",
      },
      {
        kind: "play",
        midis: [C4, E4, G4],
        text: "Now skip: C, E, G — hop over a key each time.",
        done: "Those were skips! 🐰",
      },
    ],
  },
  {
    id: "the-black-keys",
    title: "The Black Keys",
    emoji: "⬛",
    blurb: "Groups of 2 and 3.",
    lowMidi: 60,
    highMidi: 72,
    steps: [
      {
        kind: "say",
        emoji: "⬛",
        text: "The black keys come in groups of two and three. They help your eyes find your way around.",
      },
      {
        kind: "say",
        emoji: "👉",
        text: "A black key takes its name from its white neighbours. The one just right of C is called C-sharp — or F-sharp when it's right of F.",
      },
      {
        kind: "find",
        midi: Fs4,
        text: "Tap F-sharp: the first black key in the group of THREE.",
        done: "That's F-sharp! ⬛",
      },
    ],
  },
  {
    id: "sharps-and-flats",
    title: "Sharps and Flats",
    emoji: "♯",
    blurb: "A little higher or lower.",
    lowMidi: 60,
    highMidi: 72,
    steps: [
      {
        kind: "say",
        emoji: "♯",
        text: "A SHARP (♯) means play the next key to the RIGHT — a little higher. A FLAT (♭) means the next key to the LEFT — a little lower.",
      },
      {
        kind: "find",
        midi: Fs4,
        text: "Play F-sharp — one key to the right of F.",
        done: "Up a semitone! ⬆️",
      },
      {
        kind: "find",
        midi: Bb4,
        text: "Now play B-flat — one key to the LEFT of B.",
        done: "Down a semitone! ⬇️",
      },
    ],
  },
  {
    id: "the-g-position",
    title: "The G Position",
    emoji: "✋",
    blurb: "A new place for your hand.",
    lowMidi: 67,
    highMidi: 79,
    steps: [
      {
        kind: "say",
        emoji: "✋",
        text: "Let's move your hand up to G. Put your thumb on G and let each finger rest on the next white key: G A B C D.",
      },
      {
        kind: "play",
        midis: [G4, A4, B4, C5, D5],
        text: "Play up the G position: G, A, B, C, D.",
        done: "New position unlocked! 🔓",
      },
    ],
  },
  {
    id: "high-and-low",
    title: "High and Low",
    emoji: "🎢",
    blurb: "The same note, far apart.",
    lowMidi: 48,
    highMidi: 72,
    steps: [
      {
        kind: "say",
        emoji: "🎢",
        text: "The same letter appears many times across the keyboard. Cs to the left sound low; Cs to the right sound high.",
      },
      {
        kind: "find",
        midi: C3,
        text: "Tap a LOW C, near the left.",
        done: "Nice and low! 🔉",
      },
      {
        kind: "find",
        midi: C5,
        text: "Now a HIGH C, further right.",
        done: "Bright and high! 🔊",
      },
    ],
  },
  {
    id: "meet-a-chord",
    title: "Meet a Chord",
    emoji: "🎹",
    blurb: "Three notes at once!",
    lowMidi: 60,
    highMidi: 74,
    steps: [
      {
        kind: "say",
        emoji: "🎹",
        text: "A CHORD is more than one note played together. Stack C, E and G and you get the big, happy C major chord.",
      },
      {
        kind: "chord",
        midis: [C4, E4, G4],
        text: "Press C, E and G all at the same time.",
        done: "Your first chord! 🎉",
      },
    ],
  },
  {
    id: "major-and-minor",
    title: "Happy and Sad Chords",
    emoji: "🎭",
    blurb: "Major vs minor.",
    lowMidi: 60,
    highMidi: 74,
    steps: [
      {
        kind: "say",
        emoji: "😀",
        text: "Major chords sound bright and happy. C major is C, E, G.",
      },
      {
        kind: "chord",
        midis: [C4, E4, G4],
        text: "Play the happy C major chord: C, E, G.",
        done: "Sounds cheerful! 😀",
      },
      {
        kind: "say",
        emoji: "😢",
        text: "Move the middle note down one key (E → E♭) and it turns sad — that's C minor.",
      },
      {
        kind: "chord",
        midis: [C4, Eb4, G4],
        text: "Play C minor: C, E♭, G.",
        done: "Hear the difference? 🎭",
      },
    ],
  },
  {
    id: "three-chords",
    title: "Three Handy Chords",
    emoji: "🧰",
    blurb: "C, F and G.",
    lowMidi: 60,
    highMidi: 74,
    steps: [
      {
        kind: "say",
        emoji: "🧰",
        text: "With just three chords — C, F and G — you can play hundreds of songs!",
      },
      {
        kind: "chord",
        midis: [C4, E4, G4],
        text: "Play C major: C, E, G.",
        done: "One! ✅",
      },
      {
        kind: "chord",
        midis: [F4, A4, C5],
        text: "Play F major: F, A, C.",
        done: "Two! ✅",
      },
      {
        kind: "chord",
        midis: [G4, B4, D5],
        text: "Play G major: G, B, D.",
        done: "Three! You've got a whole toolkit! 🧰",
      },
    ],
  },
  {
    id: "broken-chords",
    title: "Breaking a Chord",
    emoji: "💧",
    blurb: "One note at a time.",
    lowMidi: 60,
    highMidi: 74,
    steps: [
      {
        kind: "say",
        emoji: "💧",
        text: "You can 'break' a chord by playing its notes one at a time instead of together. It sounds like gentle raindrops.",
      },
      {
        kind: "play",
        midis: [C4, E4, G4, C5],
        text: "Play the C chord broken: C, E, G, then the high C.",
        done: "Beautiful ripple! 💧",
      },
      {
        kind: "chord",
        midis: [C4, E4, G4],
        text: "Now squeeze them back together into a chord.",
        done: "Broken or together — same chord! 🎉",
      },
    ],
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

/**
 * Seed of the content pipeline (PLAN §3.2).
 *
 * Authors beginner songs from a compact text notation and emits, per song:
 *   public/library/<id>/notes.json   — flat ScoreNote[] for the engine/renderers
 * plus a combined:
 *   public/library/index.json        — SongMeta[] for the catalog
 *   public/library/ATTRIBUTIONS.md   — auto-generated credits
 *
 * Compact notation: space-separated tokens "<note><octave>:<beats>".
 *   Note = A–G with optional # or b. Rest = "R". Example: "E4:1 F4:1 G4:2".
 * A "|" token is a readable bar separator and is ignored by the parser.
 *
 * Run: node scripts/gen-songs.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "library");

const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteToMidi(token) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(token);
  if (!m) throw new Error(`Bad note token: ${token}`);
  const [, letter, accidental, octave] = m;
  let semitone = LETTER[letter];
  if (accidental === "#") semitone += 1;
  if (accidental === "b") semitone -= 1;
  return (Number(octave) + 1) * 12 + semitone;
}

function parseVoice(text, beatsPerMeasure, hand) {
  const notes = [];
  let beat = 0;
  for (const raw of text.trim().split(/[\s|]+/)) {
    if (raw === "|" || raw === "") continue;
    const [pitch, durStr] = raw.split(":");
    const dur = Number(durStr);
    if (!Number.isFinite(dur)) throw new Error(`Bad duration in ${raw}`);
    if (pitch !== "R") {
      notes.push({
        midi: noteToMidi(pitch),
        startBeat: round(beat),
        durBeats: dur,
        hand,
        measure: Math.floor(beat / beatsPerMeasure) + 1,
      });
    }
    beat += dur;
  }
  return notes;
}

const round = (n) => Math.round(n * 1000) / 1000;

const SONGS = [
  {
    id: "ode-to-joy",
    title: "Ode to Joy",
    composer: "Ludwig van Beethoven",
    level: 1,
    bpm: 100,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Beethoven, 'Ode to Joy' (Symphony No. 9). Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "The happy tune everyone knows!",
    right:
      "E4:1 E4:1 F4:1 G4:1 | G4:1 F4:1 E4:1 D4:1 | C4:1 C4:1 D4:1 E4:1 | E4:1.5 D4:0.5 D4:2 |" +
      "E4:1 E4:1 F4:1 G4:1 | G4:1 F4:1 E4:1 D4:1 | C4:1 C4:1 D4:1 E4:1 | D4:1.5 C4:0.5 C4:2",
  },
  {
    id: "twinkle-twinkle",
    title: "Twinkle, Twinkle, Little Star",
    composer: "Traditional",
    level: 1,
    bpm: 96,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Traditional melody. Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "Up above the world so high!",
    right:
      "C4:1 C4:1 G4:1 G4:1 | A4:1 A4:1 G4:2 | F4:1 F4:1 E4:1 E4:1 | D4:1 D4:1 C4:2 |" +
      "G4:1 G4:1 F4:1 F4:1 | E4:1 E4:1 D4:2 | G4:1 G4:1 F4:1 F4:1 | E4:1 E4:1 D4:2 |" +
      "C4:1 C4:1 G4:1 G4:1 | A4:1 A4:1 G4:2 | F4:1 F4:1 E4:1 E4:1 | D4:1 D4:1 C4:2",
  },
  {
    id: "mary-had-a-little-lamb",
    title: "Mary Had a Little Lamb",
    composer: "Traditional",
    level: 1,
    bpm: 100,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Traditional melody. Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "Its fleece was white as snow.",
    right:
      "E4:1 D4:1 C4:1 D4:1 | E4:1 E4:1 E4:2 | D4:1 D4:1 D4:2 | E4:1 G4:1 G4:2 |" +
      "E4:1 D4:1 C4:1 D4:1 | E4:1 E4:1 E4:1 E4:1 | D4:1 D4:1 E4:1 D4:1 | C4:4",
  },
  {
    id: "hot-cross-buns",
    title: "Hot Cross Buns",
    composer: "Traditional",
    level: 1,
    bpm: 96,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Traditional melody. Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "Just three notes — easy peasy!",
    right:
      "E4:1 D4:1 C4:2 | E4:1 D4:1 C4:2 |" +
      "C4:0.5 C4:0.5 C4:0.5 C4:0.5 D4:0.5 D4:0.5 D4:0.5 D4:0.5 | E4:1 D4:1 C4:2",
  },
  {
    id: "row-your-boat",
    title: "Row, Row, Row Your Boat",
    composer: "Traditional",
    level: 1,
    bpm: 100,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Traditional melody. Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "Gently down the stream.",
    right:
      "C4:1 C4:1 C4:0.75 D4:0.25 E4:1 | E4:0.75 D4:0.25 E4:0.75 F4:0.25 G4:2 |" +
      "C5:0.5 C5:0.5 G4:0.5 G4:0.5 E4:0.5 E4:0.5 C4:0.5 C4:0.5 | G4:0.75 F4:0.25 E4:0.75 D4:0.25 C4:2",
  },
  {
    id: "frere-jacques",
    title: "Frère Jacques",
    composer: "Traditional",
    level: 2,
    bpm: 104,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Traditional melody. Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "Are you sleeping?",
    right:
      "C4:1 D4:1 E4:1 C4:1 | C4:1 D4:1 E4:1 C4:1 | E4:1 F4:1 G4:2 | E4:1 F4:1 G4:2 |" +
      "G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 | G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 |" +
      "C4:1 G3:1 C4:2 | C4:1 G3:1 C4:2",
  },
  {
    id: "london-bridge",
    title: "London Bridge",
    composer: "Traditional",
    level: 2,
    bpm: 108,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Traditional melody. Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "…is falling down!",
    right:
      "G4:1.5 A4:0.5 G4:1 F4:1 | E4:1 F4:1 G4:2 | D4:1 E4:1 F4:2 | E4:1 F4:1 G4:2 |" +
      "G4:1.5 A4:0.5 G4:1 F4:1 | E4:1 F4:1 G4:2 | D4:2 G4:1 E4:1 | C4:4",
  },
  {
    id: "old-macdonald",
    title: "Old MacDonald",
    composer: "Traditional",
    level: 2,
    bpm: 108,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Traditional melody. Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "E-I-E-I-O!",
    right:
      "C4:1 C4:1 C4:1 G3:1 | A3:1 A3:1 G3:2 | E4:1 E4:1 D4:1 D4:1 | C4:4 |" +
      "G3:1 C4:1 C4:1 C4:1 | G3:1 A3:1 A3:1 G3:1 | E4:0.5 E4:0.5 D4:0.5 D4:0.5 C4:2",
  },
  {
    id: "when-the-saints",
    title: "When the Saints Go Marching In",
    composer: "Traditional",
    level: 2,
    bpm: 112,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Traditional spiritual. Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "Oh, when the saints…",
    right:
      "C4:1 E4:1 F4:1 G4:2 R:1 | C4:1 E4:1 F4:1 G4:2 R:1 |" +
      "C4:1 E4:1 F4:1 G4:1 E4:1 C4:1 E4:1 D4:1 | C4:4",
  },
  {
    id: "jingle-bells",
    title: "Jingle Bells",
    composer: "James Lord Pierpont",
    level: 2,
    bpm: 120,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "J. L. Pierpont, 'Jingle Bells' (1857). Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "Dashing through the snow!",
    right:
      "E4:1 E4:1 E4:2 | E4:1 E4:1 E4:2 | E4:1 G4:1 C4:1 D4:1 | E4:4 |" +
      "F4:1 F4:1 F4:1 F4:1 | F4:1 E4:1 E4:1 E4:0.5 E4:0.5 | E4:1 D4:1 D4:1 E4:1 | D4:2 G4:2",
  },
  {
    id: "happy-birthday",
    title: "Happy Birthday",
    composer: "Hill sisters",
    level: 3,
    bpm: 108,
    beatsPerMeasure: 3,
    license: "PD",
    attribution: "Mildred & Patty Hill, 'Good Morning to All' (1893). Public domain (US, 2016). Engraving © Piano Tutor, CC0.",
    blurb: "Sing it to someone special!",
    right:
      "G4:0.5 G4:0.5 A4:1 G4:1 | C5:1 B4:2 | G4:0.5 G4:0.5 A4:1 G4:1 | D5:1 C5:2 |" +
      "G4:0.5 G4:0.5 G5:1 E5:1 | C5:1 B4:1 A4:1 | F5:0.5 F5:0.5 E5:1 C5:1 | D5:1 C5:2",
  },
  {
    id: "fur-elise",
    title: "Für Elise (Theme)",
    composer: "Ludwig van Beethoven",
    level: 3,
    bpm: 100,
    beatsPerMeasure: 3,
    license: "PD",
    attribution: "Beethoven, Bagatelle in A minor 'Für Elise' (1810). Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "One of the most famous tunes ever.",
    right:
      "E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 | D5:0.5 C5:0.5 A4:1 | C4:0.5 E4:0.5 A4:0.5 B4:0.5 E4:0.5 G#4:0.5 |" +
      "B4:0.5 C5:0.5 E4:1 | E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 | D5:0.5 C5:0.5 A4:1 |" +
      "C4:0.5 E4:0.5 A4:0.5 B4:0.5 E4:0.5 C5:0.5 | B4:0.5 A4:0.5 A4:1",
  },
  {
    id: "minuet-in-g",
    title: "Minuet in G",
    composer: "Christian Petzold",
    level: 4,
    bpm: 120,
    beatsPerMeasure: 3,
    license: "PD",
    attribution: "Petzold, Minuet in G (BWV Anh. 114). Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "An elegant dance from Bach's notebook.",
    right:
      "D5:1 G4:0.5 A4:0.5 B4:0.5 C5:0.5 | D5:1 G4:1 G4:1 | E5:1 C5:0.5 D5:0.5 E5:0.5 F#5:0.5 | G5:1 G4:1 G4:1 |" +
      "C5:1 D5:0.5 C5:0.5 B4:0.5 A4:0.5 | B4:1 C5:0.5 B4:0.5 A4:0.5 G4:0.5 | F#4:1 G4:0.5 A4:0.5 B4:0.5 G4:0.5 | A4:3",
  },
  {
    id: "rain-rain-go-away",
    title: "Rain, Rain, Go Away",
    composer: "Traditional",
    level: 1,
    bpm: 96,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Traditional nursery tune. Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "Come again another day!",
    right:
      "G4:1 E4:1 G4:1 R:1 | A4:1 G4:1 E4:2 | G4:1 E4:1 G4:1 R:1 | A4:1 G4:1 E4:2",
  },
  {
    id: "lightly-row",
    title: "Lightly Row",
    composer: "Traditional",
    level: 2,
    bpm: 104,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Traditional folk tune. Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "O'er the shining waves we go.",
    right:
      "G4:1 E4:1 E4:2 | F4:1 D4:1 D4:2 | C4:1 D4:1 E4:1 F4:1 | G4:1 G4:1 G4:2 |" +
      "E4:1 E4:1 E4:1 F4:1 | D4:1 D4:1 D4:2 | C4:1 E4:1 G4:1 G4:1 | E4:2 C4:2",
  },
  {
    id: "yankee-doodle",
    title: "Yankee Doodle",
    composer: "Traditional",
    level: 2,
    bpm: 120,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Traditional American tune. Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "Stuck a feather in his cap!",
    right:
      "C4:1 C4:1 D4:1 E4:1 | C4:1 E4:1 D4:2 | C4:1 C4:1 D4:1 E4:1 | C4:2 B3:2 |" +
      "C4:1 C4:1 D4:1 E4:1 | F4:1 E4:1 D4:1 C4:1 | B3:1 G3:1 A3:1 B3:1 | C4:4",
  },
  {
    id: "this-old-man",
    title: "This Old Man",
    composer: "Traditional",
    level: 2,
    bpm: 116,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Traditional children's song. Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "He played knick-knack!",
    right:
      "G4:1 E4:1 G4:2 | G4:1 E4:1 G4:2 | A4:1 G4:1 F4:1 E4:1 | D4:2 R:2 |" +
      "C4:1 C4:1 C4:1 D4:1 | E4:1 F4:1 G4:2 | G4:1 F4:1 E4:1 D4:1 | C4:4",
  },
  {
    id: "oh-susanna",
    title: "Oh! Susanna",
    composer: "Stephen Foster",
    level: 2,
    bpm: 120,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Stephen Foster, 'Oh! Susanna' (1848). Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "A banjo on my knee.",
    right:
      "C4:0.5 D4:0.5 E4:1 G4:1 G4:1 | A4:1 G4:1 E4:1 C4:1 | D4:1 E4:1 E4:1 D4:1 | C4:1 D4:2 R:1 |" +
      "C4:0.5 D4:0.5 E4:1 G4:1 G4:1 | A4:1 G4:1 E4:1 C4:1 | D4:1 E4:1 E4:1 D4:1 | C4:2 C4:2",
  },
  {
    id: "michael-row",
    title: "Michael, Row the Boat Ashore",
    composer: "Traditional",
    level: 2,
    bpm: 108,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Traditional spiritual. Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "Hallelujah!",
    right:
      "C4:1 E4:1 G4:2 | G4:1 A4:1 G4:1 E4:1 | C4:1 E4:1 G4:1 E4:1 | D4:2 R:2 |" +
      "C4:1 E4:1 G4:2 | G4:1 A4:1 G4:1 E4:1 | E4:1 D4:1 C4:2 | C4:4",
  },
  {
    id: "deck-the-halls",
    title: "Deck the Halls",
    composer: "Traditional",
    level: 3,
    bpm: 120,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Traditional Welsh carol. Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "Fa la la la la!",
    right:
      "G4:1 F4:1 E4:1 D4:1 | C4:1 D4:1 E4:1 C4:1 | D4:1 E4:1 F4:1 D4:1 | E4:1 F4:1 G4:2 |" +
      "G4:1 F4:1 E4:1 D4:1 | C4:1 D4:1 E4:1 C4:1 | D4:0.5 E4:0.5 D4:0.5 C4:0.5 B3:1 C4:1 | D4:2 C4:2",
  },
  {
    id: "canon-in-d",
    title: "Canon in D (Theme)",
    composer: "Johann Pachelbel",
    level: 4,
    bpm: 100,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Pachelbel, Canon in D (c. 1680). Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "The wedding favourite.",
    right:
      "F#5:2 E5:2 | D5:2 C#5:2 | B4:2 A4:2 | B4:2 C#5:2 |" +
      "D5:2 C#5:2 | B4:2 A4:2 | G4:2 F#4:2 | G4:2 E4:2",
  },
  {
    id: "greensleeves",
    title: "Greensleeves",
    composer: "Traditional",
    level: 4,
    bpm: 100,
    beatsPerMeasure: 3,
    license: "PD",
    attribution: "Traditional English (c. 1580). Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "A haunting Tudor melody.",
    right:
      "A4:1 | C5:2 D5:1 | E5:1.5 F5:0.5 E5:1 | D5:2 B4:1 | G4:1.5 A4:0.5 B4:1 |" +
      "C5:2 A4:1 | A4:1.5 G#4:0.5 A4:1 | B4:2 G#4:1 | E4:3",
  },
  {
    id: "habanera",
    title: "Habanera (from Carmen)",
    composer: "Georges Bizet",
    level: 4,
    bpm: 92,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Bizet, 'Habanera' from Carmen (1875). Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "Love is a rebellious bird.",
    right:
      "D5:1 C#5:0.5 C5:0.5 B4:0.5 A#4:0.5 A4:1 | A4:0.5 A4:0.5 A4:1 R:2 |" +
      "D5:1 C#5:0.5 C5:0.5 B4:0.5 A#4:0.5 A4:1 | A4:0.5 A4:0.5 A4:1 R:2",
  },
  {
    id: "turkish-march",
    title: "Rondo alla Turca (Theme)",
    composer: "Wolfgang Amadeus Mozart",
    level: 5,
    bpm: 120,
    beatsPerMeasure: 4,
    license: "PD",
    attribution: "Mozart, 'Rondo alla Turca' from Sonata K.331 (1783). Public domain. Engraving © Piano Tutor, CC0.",
    blurb: "The dazzling Turkish March.",
    right:
      "B4:0.5 A4:0.5 G#4:0.5 A4:0.5 C5:1 R:1 | D5:0.5 C5:0.5 B4:0.5 C5:0.5 E5:1 R:1 |" +
      "F5:0.5 E5:0.5 D#5:0.5 E5:0.5 B5:0.5 A5:0.5 G#5:0.5 A5:0.5 | C6:0.5 B5:0.5 A5:0.5 G#5:0.5 A5:1 R:1",
  },
];

async function main() {
  const index = [];
  const attributions = ["# Music Attributions", "", "All bundled music is public domain or openly licensed.", ""];

  for (const song of SONGS) {
    const notes = parseVoice(song.right, song.beatsPerMeasure, "right").map((n, i) => ({
      id: i,
      ...n,
    }));

    const dir = join(OUT, song.id);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "notes.json"), JSON.stringify(notes, null, 2) + "\n");

    index.push({
      id: song.id,
      title: song.title,
      composer: song.composer,
      level: song.level,
      bpm: song.bpm,
      beatsPerMeasure: song.beatsPerMeasure,
      hands: ["right"],
      license: song.license,
      attribution: song.attribution,
      blurb: song.blurb,
    });

    attributions.push(`- **${song.title}** — ${song.attribution}`);
  }

  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, "index.json"), JSON.stringify(index, null, 2) + "\n");
  await writeFile(join(OUT, "ATTRIBUTIONS.md"), attributions.join("\n") + "\n");

  console.log(`Generated ${SONGS.length} songs → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

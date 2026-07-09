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

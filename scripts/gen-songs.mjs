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
import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAbc } from "./abc.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "library");
const ABC_DIR = join(__dirname, "..", "content", "abc");

const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Default number of times a piece plays through, by difficulty level. Higher
// levels are longer. Individual songs can override with a `reps` field.
const REPS_FOR_LEVEL = { 1: 1, 2: 2, 3: 2, 4: 2, 5: 3 };

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

function slug(title) {
  return (
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) ||
    "song"
  );
}

/**
 * Load every `content/abc/*.abc` file as a song descriptor (same shape as an
 * inline SONGS entry, but sourced from a portable, verified ABC file). Metadata
 * comes from the ABC headers (T:/C:) and %% directives — see content/abc/README.
 */
async function loadAbcSongs() {
  if (!existsSync(ABC_DIR)) return [];
  const files = (await readdir(ABC_DIR)).filter((f) => /\.abc$/i.test(f));
  const songs = [];
  for (const file of files) {
    const abc = await readFile(join(ABC_DIR, file), "utf8");
    const parsed = parseAbc(abc);
    const d = parsed.directives;
    const title = parsed.title || basename(file, ".abc");
    songs.push({
      id: d.id || slug(basename(file, ".abc")) || slug(title),
      title,
      composer: parsed.composer || d.composer || "Traditional",
      level: d.level ? Number(d.level) : 3,
      bpm: d.bpm ? Number(d.bpm) : undefined,
      beatsPerMeasure: d.meter ? Number(d.meter) : undefined,
      reps: d.reps ? Number(d.reps) : undefined,
      license: d.license || "PD",
      attribution: d.attribution || `${title}. Public domain.`,
      blurb: d.blurb || "",
      abc,
    });
  }
  return songs;
}

// Every bundled song is sourced from a verified external file — ABC under
// content/abc/ or MIDI under content/midi/ — never hand-transcribed from memory.
// There are therefore no inline songs; this list is intentionally empty. To add
// a song, drop an .abc or .mid file into content/ (see content/abc/README.md).
const SONGS = [];

async function main() {
  const index = [];
  const attributions = ["# Music Attributions", "", "All bundled music is public domain or openly licensed.", ""];

  // Merge inline songs with content/abc/*.abc files. A file whose id matches an
  // inline song replaces it, so the library migrates to verified sources one
  // dropped file at a time.
  const abcSongs = await loadAbcSongs();
  const byId = new Map(SONGS.map((s) => [s.id, s]));
  for (const s of abcSongs) byId.set(s.id, s);
  const allSongs = [...byId.values()];

  for (const song of allSongs) {
    // A song is defined either by verified ABC notation (preferred — sourced
    // from known-good public-domain transcriptions) or by the compact voice
    // shorthand. Length scales with level via repeats.
    const reps = song.reps ?? REPS_FOR_LEVEL[song.level] ?? 1;
    let notes;
    let bpm = song.bpm;
    let beatsPerMeasure = song.beatsPerMeasure;
    if (song.abc) {
      const parsed = parseAbc(song.abc);
      bpm = song.bpm ?? parsed.bpm;
      beatsPerMeasure = song.beatsPerMeasure ?? parsed.beatsPerMeasure;
      const one = parsed.notes;
      const barBeats = beatsPerMeasure;
      const totalBars = Math.ceil(
        (Math.max(...one.map((n) => n.startBeat + n.durBeats)) || 0) / barBeats,
      );
      notes = [];
      for (let r = 0; r < reps; r++) {
        const offset = r * totalBars * barBeats;
        for (const n of one) {
          notes.push({
            ...n,
            startBeat: round(n.startBeat + offset),
            measure: Math.floor((n.startBeat + offset) / barBeats) + 1,
          });
        }
      }
      notes = notes.map((n, i) => ({ ...n, id: i }));
    } else {
      const voice = Array.from({ length: reps }, () => song.right).join(" | ");
      notes = parseVoice(voice, beatsPerMeasure, "right").map((n, i) => ({ id: i, ...n }));
    }

    const dir = join(OUT, song.id);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "notes.json"), JSON.stringify(notes, null, 2) + "\n");

    index.push({
      id: song.id,
      title: song.title,
      composer: song.composer,
      level: song.level,
      bpm,
      beatsPerMeasure,
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

  console.log(
    `Generated ${allSongs.length} songs → ${OUT} (${abcSongs.length} from content/abc/)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

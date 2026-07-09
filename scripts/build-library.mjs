/**
 * Build-time MIDI ingestion (PLAN §3.2).
 *
 * Converts any `.mid` files in `content/midi/` into bundled library songs, using
 * the same melody-extraction approach as the in-app importer
 * (src/library/midi-import.ts) — kept in sync deliberately; this is the Node
 * mirror so the build has no TS/loader dependency.
 *
 * Run AFTER scripts/gen-songs.mjs: it merges MIDI-sourced songs into the
 * existing index.json (a MIDI file whose id matches a hand-authored song wins,
 * so the library can be migrated piece by piece as real files are sourced).
 *
 * A sidecar `<name>.json` next to a `.mid` may override metadata, e.g.
 *   { "title": "Für Elise", "composer": "Beethoven", "level": 3,
 *     "license": "PD", "attribution": "…", "blurb": "…", "trackIndex": 1 }
 *
 * Run: node scripts/build-library.mjs
 */
// @tonejs/midi ships CommonJS; under Node ESM only the default export resolves
// (Vite/TS interop handles the named form in the browser build).
import midiPkg from "@tonejs/midi";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";

const { Midi } = midiPkg;
import { existsSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIDI_DIR = join(__dirname, "..", "content", "midi");
const OUT = join(__dirname, "..", "public", "library");

const round3 = (n) => Math.round(n * 1000) / 1000;

function slug(title) {
  return (
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) ||
    "song"
  );
}

function pickMelodyTrack(midi) {
  const scored = midi.tracks
    .map((t, i) => ({
      i,
      count: t.notes.length,
      avg: t.notes.length ? t.notes.reduce((s, n) => s + n.midi, 0) / t.notes.length : 0,
    }))
    .filter((t) => t.count > 0);
  if (!scored.length) return 0;
  const maxCount = Math.max(...scored.map((t) => t.count));
  const eligible = scored.filter((t) => t.count >= Math.max(8, maxCount * 0.25));
  const pool = eligible.length ? eligible : scored;
  pool.sort((a, b) => b.avg - a.avg);
  return pool[0].i;
}

function convert(buffer, meta) {
  const midi = new Midi(new Uint8Array(buffer));
  const ppq = midi.header.ppq || 480;
  const bpm = Math.round(midi.header.tempos[0]?.bpm ?? 100);
  const beatsPerMeasure = midi.header.timeSignatures[0]?.timeSignature?.[0] ?? 4;
  const chosen = meta.trackIndex ?? pickMelodyTrack(midi);
  const track = midi.tracks[chosen];

  // Optional pitch window (sidecar `minPitch`/`maxPitch`): drop bass/percussion
  // so the skyline follows the melody register on dense solo-piano tracks.
  const minPitch = meta.minPitch ?? 0;
  const maxPitch = meta.maxPitch ?? 127;

  const byStart = new Map();
  for (const n of track?.notes ?? []) {
    if (n.midi < minPitch || n.midi > maxPitch) continue;
    const cur = byStart.get(n.ticks);
    if (!cur || n.midi > cur.midi) byStart.set(n.ticks, n);
  }
  const sorted = [...byStart.values()].sort((a, b) => a.ticks - b.ticks);
  const notes = sorted.map((n, id) => {
    const startBeat = round3(n.ticks / ppq);
    return {
      id,
      midi: n.midi,
      startBeat,
      durBeats: Math.max(0.25, round3(n.durationTicks / ppq)),
      hand: "right",
      measure: Math.floor(startBeat / beatsPerMeasure) + 1,
    };
  });
  return { notes, bpm, beatsPerMeasure };
}

async function main() {
  if (!existsSync(MIDI_DIR)) {
    console.log("No content/midi/ directory — skipping MIDI ingestion.");
    return;
  }
  const files = (await readdir(MIDI_DIR)).filter((f) => /\.midi?$/i.test(f));
  if (!files.length) {
    console.log("No .mid files in content/midi/ — nothing to convert.");
    return;
  }

  const index = JSON.parse(await readFile(join(OUT, "index.json"), "utf8"));
  const byId = new Map(index.map((s) => [s.id, s]));

  for (const file of files) {
    const name = basename(file).replace(/\.midi?$/i, "");
    const sidecar = join(MIDI_DIR, `${name}.json`);
    const meta = existsSync(sidecar) ? JSON.parse(await readFile(sidecar, "utf8")) : {};
    const buffer = await readFile(join(MIDI_DIR, file));
    const { notes, bpm, beatsPerMeasure } = convert(buffer, meta);
    if (!notes.length) {
      console.warn(`  ${file}: no notes found, skipped`);
      continue;
    }

    const title = meta.title ?? name;
    const id = meta.id ?? slug(title);
    await mkdir(join(OUT, id), { recursive: true });
    await writeFile(join(OUT, id, "notes.json"), JSON.stringify(notes, null, 2) + "\n");

    byId.set(id, {
      id,
      title,
      composer: meta.composer ?? "Unknown",
      level: meta.level ?? 3,
      bpm: meta.bpm ?? bpm,
      beatsPerMeasure: meta.beatsPerMeasure ?? beatsPerMeasure,
      hands: ["right"],
      license: meta.license ?? "PD",
      attribution: meta.attribution ?? `${title}. Public domain.`,
      blurb: meta.blurb,
    });
    console.log(`  ${file} → ${id} (${notes.length} notes)`);
  }

  const merged = [...byId.values()];
  await writeFile(join(OUT, "index.json"), JSON.stringify(merged, null, 2) + "\n");
  console.log(`Library now has ${merged.length} songs (${files.length} from MIDI).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

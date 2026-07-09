import { Midi } from "@tonejs/midi";
import type { Song, ScoreNote } from "@/engine/types";

/**
 * Convert a standard MIDI file into a playable Song (PLAN §3.2/§3.3).
 *
 * Real piano MIDI is polyphonic and two-handed, but mic play-along needs a
 * single melodic line, so we:
 *   1. pick the most melody-like track (highest average pitch with enough notes),
 *   2. "dechord" it with a skyline pass — at each onset keep the highest note,
 *   3. convert tick positions to beats (tempo-independent) for our note model.
 *
 * This runs identically in the browser (user imports) and in Node (build-time
 * conversion of bundled files), because @tonejs/midi works in both.
 */

export interface MidiImportOptions {
  /** Force a specific track index instead of auto-detecting the melody. */
  trackIndex?: number;
  /**
   * Import several tracks at once (e.g. both hands), merged into one note list.
   * When one track is chosen we skyline-dechord it to a clean melody; when more
   * than one is chosen we keep every note so the full arrangement is preserved.
   */
  trackIndices?: number[];
  /** Quantize note starts/durations to this fraction of a beat (0 = off). */
  quantize?: number;
}

/** Summary of one non-empty MIDI track, for the import track picker. */
export interface TrackInfo {
  index: number;
  noteCount: number;
  avgPitch: number;
  lowPitch: number;
  highPitch: number;
  name?: string;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

function quantizeTo(value: number, grid: number): number {
  if (!grid) return round3(value);
  return round3(Math.round(value / grid) * grid);
}

/** Pick the track that most looks like a melody line. */
function pickMelodyTrack(midi: Midi): number {
  const scored = midi.tracks
    .map((t, i) => ({
      i,
      count: t.notes.length,
      avg: t.notes.length
        ? t.notes.reduce((s, n) => s + n.midi, 0) / t.notes.length
        : 0,
    }))
    .filter((t) => t.count > 0);
  if (scored.length === 0) return 0;

  const maxCount = Math.max(...scored.map((t) => t.count));
  // Prefer higher-pitched tracks (melody), but require a reasonable note count
  // so we don't pick a sparse cymbal/ornament track.
  const eligible = scored.filter((t) => t.count >= Math.max(8, maxCount * 0.25));
  const pool = eligible.length ? eligible : scored;
  pool.sort((a, b) => b.avg - a.avg);
  return pool[0].i;
}

export interface MidiParseResult {
  song: Song;
  /** All non-empty tracks, so the import UI can offer per-track checkboxes. */
  tracks: TrackInfo[];
  /** Which track indices this parse used. */
  chosenTracks: number[];
}

/** Summarise every non-empty track for the import picker. */
function describeTracks(midi: Midi): TrackInfo[] {
  const out: TrackInfo[] = [];
  midi.tracks.forEach((t, index) => {
    if (!t.notes.length) return;
    const pitches = t.notes.map((n) => n.midi);
    out.push({
      index,
      noteCount: t.notes.length,
      avgPitch: Math.round(pitches.reduce((s, p) => s + p, 0) / pitches.length),
      lowPitch: Math.min(...pitches),
      highPitch: Math.max(...pitches),
      name: t.name || undefined,
    });
  });
  return out;
}

export function parseMidiToSong(
  data: ArrayBuffer | Uint8Array,
  title: string,
  opts: MidiImportOptions = {},
): MidiParseResult {
  const midi = new Midi(data instanceof Uint8Array ? data : new Uint8Array(data));
  const ppq = midi.header.ppq || 480;
  const bpm = Math.round(midi.header.tempos[0]?.bpm ?? 100);
  const beatsPerMeasure = midi.header.timeSignatures[0]?.timeSignature?.[0] ?? 4;
  const grid = opts.quantize ?? 0;

  const tracks = describeTracks(midi);
  const chosenTracks =
    opts.trackIndices && opts.trackIndices.length > 0
      ? opts.trackIndices
      : [opts.trackIndex ?? pickMelodyTrack(midi)];
  // One track → skyline to a clean single melody. Several → keep every note so
  // the player hears the combined arrangement they're auditioning.
  const single = chosenTracks.length === 1;

  const collected: { midi: number; ticks: number; durTicks: number }[] = [];
  for (const ti of chosenTracks) {
    const track = midi.tracks[ti];
    if (!track) continue;
    if (single) {
      const byStart = new Map<number, { midi: number; ticks: number; durTicks: number }>();
      for (const n of track.notes) {
        const existing = byStart.get(n.ticks);
        if (!existing || n.midi > existing.midi) {
          byStart.set(n.ticks, { midi: n.midi, ticks: n.ticks, durTicks: n.durationTicks });
        }
      }
      collected.push(...byStart.values());
    } else {
      for (const n of track.notes) {
        collected.push({ midi: n.midi, ticks: n.ticks, durTicks: n.durationTicks });
      }
    }
  }

  const sorted = collected.sort((a, b) => a.ticks - b.ticks || a.midi - b.midi);
  const notes: ScoreNote[] = sorted.map((n, id) => {
    const startBeat = quantizeTo(n.ticks / ppq, grid);
    const durBeats = Math.max(0.25, quantizeTo(n.durTicks / ppq, grid));
    return {
      id,
      midi: n.midi,
      startBeat,
      durBeats,
      hand: "right",
      measure: Math.floor(startBeat / beatsPerMeasure) + 1,
    };
  });

  const song: Song = {
    id: `user-${slug(title)}`,
    title,
    composer: "Imported",
    level: estimateLevel(notes),
    bpm,
    beatsPerMeasure,
    hands: ["right"],
    license: "User-provided",
    attribution: `Imported by you from a MIDI file.`,
    blurb: `${notes.length} notes`,
    notes,
  };

  return { song, tracks, chosenTracks };
}

/** Rough difficulty from length and pitch range. */
function estimateLevel(notes: ScoreNote[]): number {
  if (notes.length === 0) return 1;
  const range = Math.max(...notes.map((n) => n.midi)) - Math.min(...notes.map((n) => n.midi));
  const hasSharps = notes.some((n) => [1, 3, 6, 8, 10].includes(((n.midi % 12) + 12) % 12));
  let level = 1;
  if (notes.length > 40 || range > 12) level = 2;
  if (notes.length > 80 || range > 19 || hasSharps) level = 3;
  if (notes.length > 150 || range > 24) level = 4;
  if (notes.length > 250) level = 5;
  return level;
}

export function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "song";
}

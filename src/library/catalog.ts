import type { SongMeta, ScoreNote, Song } from "@/engine/types";
import { isExerciseId, getExercise } from "@/lessons/exercises";

/**
 * Loads the bundled song library from static JSON under public/library.
 * All fetches are prefixed with Vite's BASE_URL so they resolve correctly both
 * at the domain root (dev) and under /piano-tutor/ (GitHub Pages).
 */
const base = import.meta.env.BASE_URL;

function libUrl(path: string): string {
  return `${base}library/${path}`.replace(/\/{2,}/g, "/");
}

let catalogCache: SongMeta[] | null = null;

export async function loadCatalog(): Promise<SongMeta[]> {
  if (catalogCache) return catalogCache;
  const res = await fetch(libUrl("index.json"));
  if (!res.ok) throw new Error(`Failed to load library index (${res.status})`);
  catalogCache = (await res.json()) as SongMeta[];
  return catalogCache;
}

const songCache = new Map<string, Song>();

export async function loadSong(id: string): Promise<Song> {
  const cached = songCache.get(id);
  if (cached) return cached;

  // Exercises are generated in-memory, not fetched from the library.
  if (isExerciseId(id)) {
    const exercise = getExercise(id);
    if (!exercise) throw new Error(`Unknown exercise: ${id}`);
    songCache.set(id, exercise);
    return exercise;
  }

  const catalog = await loadCatalog();
  const meta = catalog.find((s) => s.id === id);
  if (!meta) throw new Error(`Unknown song: ${id}`);

  const res = await fetch(libUrl(`${id}/notes.json`));
  if (!res.ok) throw new Error(`Failed to load notes for ${id} (${res.status})`);
  const notes = (await res.json()) as ScoreNote[];

  const song: Song = { ...meta, notes };
  songCache.set(id, song);
  return song;
}

/** Total duration of a song in beats (end of its last note). */
export function songLengthBeats(notes: ScoreNote[]): number {
  return notes.reduce((max, n) => Math.max(max, n.startBeat + n.durBeats), 0);
}

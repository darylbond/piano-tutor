import type { SongMeta, ScoreNote, Song } from "@/engine/types";
import { isExerciseId, getExercise } from "@/lessons/exercises";
import { isUserSongId, getUserSong, listUserSongs } from "@/library/user-songs";

/**
 * Loads the bundled song library from static JSON under public/library.
 * All fetches are prefixed with Vite's BASE_URL so they resolve correctly both
 * at the domain root (dev) and under /piano-tutor/ (GitHub Pages).
 */
const base = import.meta.env.BASE_URL;

function libUrl(path: string): string {
  return `${base}library/${path}`.replace(/\/{2,}/g, "/");
}

let bundledCache: SongMeta[] | null = null;

async function loadBundled(): Promise<SongMeta[]> {
  if (bundledCache) return bundledCache;
  const res = await fetch(libUrl("index.json"));
  if (!res.ok) throw new Error(`Failed to load library index (${res.status})`);
  bundledCache = (await res.json()) as SongMeta[];
  return bundledCache;
}

/** Bundled songs plus the user's imported songs (freshly listed each call). */
export async function loadCatalog(): Promise<SongMeta[]> {
  const [bundled, user] = await Promise.all([loadBundled(), listUserSongs()]);
  return [...user, ...bundled];
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

  // User-imported songs come from IndexedDB, not the bundled library.
  if (isUserSongId(id)) {
    const song = await getUserSong(id);
    if (!song) throw new Error(`Unknown imported song: ${id}`);
    songCache.set(id, song);
    return song;
  }

  const catalog = await loadBundled();
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

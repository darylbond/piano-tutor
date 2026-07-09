import type { Song, SongMeta } from "@/engine/types";

/**
 * On-device storage for user-imported songs (PLAN §3.3), backed by IndexedDB so
 * it holds far more than localStorage and keeps note data out of the settings
 * blob. No servers — imported songs live only in this browser.
 */

const DB_NAME = "piano-tutor.songs";
const STORE = "songs";
const USER_PREFIX = "user-";

export function isUserSongId(id: string): boolean {
  return id.startsWith(USER_PREFIX);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const store = db.transaction(STORE, mode).objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function saveUserSong(song: Song): Promise<void> {
  await tx("readwrite", (s) => s.put(song));
}

export async function getUserSong(id: string): Promise<Song | undefined> {
  return tx<Song | undefined>("readonly", (s) => s.get(id) as IDBRequest<Song | undefined>);
}

export async function deleteUserSong(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}

export async function listUserSongs(): Promise<SongMeta[]> {
  try {
    const all = await tx<Song[]>("readonly", (s) => s.getAll() as IDBRequest<Song[]>);
    // Strip the heavy notes array for the catalog listing.
    return all.map(({ notes: _notes, ...meta }) => meta);
  } catch {
    return [];
  }
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SongMeta } from "@/engine/types";
import { loadCatalog } from "@/library/catalog";
import { isUserSongId, deleteUserSong } from "@/library/user-songs";
import { useProgress } from "@/store/progress";
import "./LibraryScreen.css";

const LEVEL_NAMES: Record<number, string> = {
  1: "Beginner",
  2: "Easy",
  3: "Medium",
  4: "Hard",
  5: "Expert",
};

export function LibraryScreen() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<SongMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<number | "all">("all");
  const progress = useProgress((s) => s.songs);

  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    loadCatalog()
      .then(setSongs)
      .catch((e) => setError(String(e)));
  }, [reloadKey]);

  async function removeSong(id: string) {
    await deleteUserSong(id);
    setReloadKey((k) => k + 1);
  }

  const filtered = useMemo(() => {
    if (!songs) return [];
    const q = query.trim().toLowerCase();
    return songs.filter((s) => {
      if (level !== "all" && s.level !== level) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.composer.toLowerCase().includes(q)
      );
    });
  }, [songs, query, level]);

  const levels = useMemo(() => {
    const set = new Set(songs?.map((s) => s.level) ?? []);
    return [...set].sort((a, b) => a - b);
  }, [songs]);

  if (error) {
    return <p className="library__error">Couldn't load the songs. {error}</p>;
  }

  return (
    <div className="library">
      <div className="library__head">
        <h2 className="library__heading">Pick a song 🎵</h2>
        <button className="library__add" onClick={() => navigate("/import")}>
          ＋ Add a song
        </button>
      </div>

      <div className="library__controls">
        <input
          className="library__search"
          type="search"
          placeholder="Search songs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search songs"
        />
        <div className="library__filters" role="group" aria-label="Difficulty">
          <button
            className={`chip ${level === "all" ? "chip--on" : ""}`}
            onClick={() => setLevel("all")}
          >
            All
          </button>
          {levels.map((lv) => (
            <button
              key={lv}
              className={`chip ${level === lv ? "chip--on" : ""}`}
              onClick={() => setLevel(lv)}
              title={`Level ${lv}`}
            >
              {LEVEL_NAMES[lv] ?? `Level ${lv}`}
            </button>
          ))}
        </div>
      </div>

      {!songs ? (
        <p className="library__loading">Loading songs…</p>
      ) : filtered.length === 0 ? (
        <p className="library__empty">No songs match. Try another search!</p>
      ) : (
        <ul className="song-grid">
          {filtered.map((song) => (
            <li key={song.id} className="song-cell">
              {isUserSongId(song.id) && (
                <button
                  className="song-card__delete"
                  title="Remove this imported song"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Remove "${song.title}"?`)) void removeSong(song.id);
                  }}
                >
                  ✕
                </button>
              )}
              <button
                className="song-card"
                onClick={() => navigate(`/play/${song.id}`)}
              >
                <span className="song-card__level" aria-label={`Level ${song.level}, ${LEVEL_NAMES[song.level]}`}>
                  {isUserSongId(song.id) ? "★ Yours" : LEVEL_NAMES[song.level] ?? `Level ${song.level}`}
                </span>
                <span className="song-card__title">{song.title}</span>
                <span className="song-card__composer">{song.composer}</span>
                {song.blurb && (
                  <span className="song-card__blurb">{song.blurb}</span>
                )}
                <span className="song-card__foot">
                  <span className="song-card__play" aria-hidden="true">▶ Play</span>
                  {progress[song.id]?.bestStars ? (
                    <span
                      className="song-card__stars"
                      aria-label={`Best ${progress[song.id].bestStars} of 3 stars`}
                    >
                      {[1, 2, 3].map((i) => (
                        <span key={i} className={i <= progress[song.id].bestStars ? "on" : "off"}>★</span>
                      ))}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

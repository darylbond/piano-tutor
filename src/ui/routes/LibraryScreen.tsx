import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SongMeta } from "@/engine/types";
import { loadCatalog } from "@/library/catalog";
import "./LibraryScreen.css";

export function LibraryScreen() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<SongMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<number | "all">("all");

  useEffect(() => {
    loadCatalog()
      .then(setSongs)
      .catch((e) => setError(String(e)));
  }, []);

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
      <h2 className="library__heading">Pick a song 🎵</h2>

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
            >
              {"⭐".repeat(lv)}
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
            <li key={song.id}>
              <button
                className="song-card"
                onClick={() => navigate(`/play/${song.id}`)}
              >
                <span className="song-card__level" aria-label={`Level ${song.level}`}>
                  {"⭐".repeat(song.level)}
                </span>
                <span className="song-card__title">{song.title}</span>
                <span className="song-card__composer">{song.composer}</span>
                {song.blurb && (
                  <span className="song-card__blurb">{song.blurb}</span>
                )}
                <span className="song-card__play" aria-hidden="true">▶ Play</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

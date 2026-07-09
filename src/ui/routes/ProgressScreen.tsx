import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { SongMeta } from "@/engine/types";
import { loadCatalog } from "@/library/catalog";
import { useProgress } from "@/store/progress";
import "./ProgressScreen.css";

export function ProgressScreen() {
  const [catalog, setCatalog] = useState<SongMeta[]>([]);
  const songs = useProgress((s) => s.songs);
  const totalStars = useProgress((s) => s.totalStars);
  const exportJson = useProgress((s) => s.exportJson);
  const importJson = useProgress((s) => s.importJson);
  const reset = useProgress((s) => s.reset);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  const played = useMemo(
    () => catalog.filter((s) => songs[s.id]?.plays),
    [catalog, songs],
  );
  const stars = totalStars();

  function handleExport() {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "piano-tutor-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    setImportMsg(importJson(text) ? "Progress loaded! 🎉" : "That file didn't look right.");
  }

  return (
    <div className="progress">
      <h2 className="progress__heading">Your Progress 🏆</h2>

      <div className="progress__total">
        <span className="progress__total-num">{stars}</span>
        <span className="progress__total-label">stars earned</span>
      </div>

      {played.length === 0 ? (
        <div className="progress__empty">
          <p>No songs played yet. Let's earn some stars!</p>
          <Link to="/library" className="progress__cta">Pick a song →</Link>
        </div>
      ) : (
        <ul className="progress__list">
          {played.map((song) => {
            const p = songs[song.id]!;
            return (
              <li key={song.id} className="progress__row">
                <Link to={`/play/${song.id}`} className="progress__song">
                  <span className="progress__song-title">{song.title}</span>
                  <span className="progress__song-meta">
                    {p.plays} {p.plays === 1 ? "play" : "plays"} ·{" "}
                    {Math.round(p.bestAccuracy * 100)}% best
                  </span>
                </Link>
                <span className="progress__stars" aria-label={`${p.bestStars} stars`}>
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={i <= p.bestStars ? "on" : "off"}
                    >
                      ★
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <details className="progress__parent">
        <summary>For grown-ups</summary>
        <p className="progress__note">
          All progress is stored on this device only — there are no accounts and
          nothing is uploaded. Use these to move progress between devices.
        </p>
        <div className="progress__parent-actions">
          <button className="progress__btn" onClick={handleExport}>
            ⬇ Save progress to a file
          </button>
          <button
            className="progress__btn"
            onClick={() => fileRef.current?.click()}
          >
            ⬆ Load progress from a file
          </button>
          <button
            className="progress__btn progress__btn--danger"
            onClick={() => {
              if (confirm("Clear all stars and progress on this device?")) reset();
            }}
          >
            Reset everything
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFile(f);
              e.target.value = "";
            }}
          />
        </div>
        {importMsg && <p className="progress__import-msg">{importMsg}</p>}
      </details>
    </div>
  );
}

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Song } from "@/engine/types";
import { parseMidiToSong, slug, type MidiParseResult } from "@/library/midi-import";
import { saveUserSong } from "@/library/user-songs";
import { BigButton } from "@/ui/components/BigButton";
import "./ImportScreen.css";

export function ImportScreen() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<ArrayBuffer | null>(null);
  const [parsed, setParsed] = useState<MidiParseResult | null>(null);
  const [title, setTitle] = useState("");
  const [track, setTrack] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    const name = file.name.replace(/\.midi?$/i, "");
    try {
      const buffer = await file.arrayBuffer();
      bufferRef.current = buffer;
      const result = parseMidiToSong(buffer, name);
      if (result.song.notes.length === 0) {
        setError("I couldn't find any notes in that file.");
        return;
      }
      setParsed(result);
      setTitle(name);
      setTrack(undefined);
    } catch {
      setError("That doesn't look like a MIDI file I can read.");
    }
  }

  function reparseTrack(index: number | undefined) {
    if (!bufferRef.current) return;
    setTrack(index);
    setParsed(parseMidiToSong(bufferRef.current, title || "Song", { trackIndex: index }));
  }

  async function save() {
    if (!parsed) return;
    const finalTitle = title.trim() || "My Song";
    const song: Song = {
      ...parsed.song,
      title: finalTitle,
      id: `user-${slug(finalTitle)}`,
    };
    await saveUserSong(song);
    navigate(`/play/${song.id}`);
  }

  const song = parsed?.song;

  return (
    <div className="import">
      <h2>Add a Song 🎼</h2>
      <p className="import__intro">
        Import a <strong>MIDI (.mid)</strong> file from your computer — the app
        pulls out the melody so you can play along. Your song stays on this device.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".mid,.midi,audio/midi"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />
      <BigButton variant="primary" size="lg" icon="📁" onClick={() => fileRef.current?.click()}>
        Choose a MIDI file
      </BigButton>

      {error && <p className="import__error">{error}</p>}

      {song && (
        <div className="import__preview">
          <label className="import__field">
            <span>Song name</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div className="import__stats">
            <span>{song.notes.length} notes</span>
            <span>Level {song.level}</span>
            <span>{song.bpm} bpm</span>
          </div>

          {parsed.trackCount > 1 && (
            <label className="import__field">
              <span>Which part is the melody?</span>
              <select
                value={track ?? parsed.chosenTrack}
                onChange={(e) => reparseTrack(Number(e.target.value))}
              >
                {Array.from({ length: parsed.trackCount }, (_, i) => (
                  <option key={i} value={i}>
                    Track {i + 1}
                  </option>
                ))}
              </select>
            </label>
          )}

          <p className="import__hint">
            Tip: if it sounds wrong, try a different track — many files put the
            melody on its own part.
          </p>

          <BigButton variant="secondary" size="lg" icon="💾" onClick={save}>
            Save & play
          </BigButton>
        </div>
      )}

      <details className="import__where">
        <summary>Where do I get MIDI files?</summary>
        <p>
          Search for “<em>song name</em> MIDI” — there are large free collections
          of public-domain classical and folk music. You can also export MIDI
          from most music-notation apps. Only import files you have the right to
          use.
        </p>
      </details>
    </div>
  );
}

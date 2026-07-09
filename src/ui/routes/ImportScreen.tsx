import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Song } from "@/engine/types";
import { parseMidiToSong, slug, type MidiParseResult } from "@/library/midi-import";
import { saveUserSong } from "@/library/user-songs";
import { Synth } from "@/engine/synth";
import { midiToName } from "@/engine/music";
import { NoteRainView } from "@/ui/components/NoteRainView";
import { ScrubBar } from "@/ui/components/ScrubBar";
import { BigButton } from "@/ui/components/BigButton";
import { useSettings } from "@/store/settings";
import "./ImportScreen.css";

export function ImportScreen() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<ArrayBuffer | null>(null);
  const [parsed, setParsed] = useState<MidiParseResult | null>(null);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewPct, setPreviewPct] = useState(0);
  const synthRef = useRef(new Synth());
  // Audio-clock zero (seconds) for the current preview; drives the Note Rain.
  const previewZero = useRef(0);
  const previewingRef = useRef(false);
  const previewTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const synth = synthRef.current;
    return () => {
      synth.stop();
      window.clearTimeout(previewTimer.current);
    };
  }, []);

  const song = parsed?.song;

  function stopPreview() {
    synthRef.current.stop();
    window.clearTimeout(previewTimer.current);
    previewingRef.current = false;
    setPreviewing(false);
    setPreviewPct(0);
  }

  function songTotalMs(s: Song): number {
    const lastBeat = s.notes.reduce((m, n) => Math.max(m, n.startBeat + n.durBeats), 0);
    return (lastBeat / s.bpm) * 60_000;
  }

  /** Start (or restart) preview playback from `offsetMs` into the piece. */
  function playPreviewFrom(s: Song, offsetMs = 0) {
    synthRef.current.stop();
    window.clearTimeout(previewTimer.current);
    synthRef.current.setVolume(useSettings.getState().volume);
    // playSong returns the audio-clock time (s) where the playhead's 0 sits.
    previewZero.current = synthRef.current.playSong(s.notes, s.bpm, offsetMs, 1);
    previewingRef.current = true;
    setPreviewing(true);
    const remainMs = songTotalMs(s) - offsetMs + 600;
    previewTimer.current = window.setTimeout(stopPreview, Math.max(200, remainMs));
  }

  function playPreview(s: Song) {
    playPreviewFrom(s, 0);
  }

  function seekPreview(fraction: number) {
    if (!song) return;
    playPreviewFrom(song, Math.max(0, Math.min(1, fraction)) * songTotalMs(song));
    setPreviewPct(fraction);
  }

  // Note Rain reads the live audio playhead while previewing, else sits at t=0.
  function getTimeMs() {
    if (!previewingRef.current) return 0;
    return (synthRef.current.now() - previewZero.current) * 1000;
  }

  // While previewing, advance the scrub bar from the live audio clock.
  useEffect(() => {
    if (!previewing || !song) return;
    const total = songTotalMs(song);
    const id = window.setInterval(() => {
      setPreviewPct(total > 0 ? Math.min(1, getTimeMs() / total) : 0);
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewing, song]);

  async function onFile(file: File) {
    setError(null);
    stopPreview();
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
      setSelected(result.chosenTracks);
    } catch {
      setError("That doesn't look like a MIDI file I can read.");
    }
  }

  function reparse(indices: number[]) {
    if (!bufferRef.current || indices.length === 0) return;
    // Keep playing across a track toggle: re-parse, then resume from where the
    // playhead currently is with the new set of notes.
    const wasPlaying = previewingRef.current;
    const posMs = wasPlaying ? Math.max(0, getTimeMs()) : 0;
    const result = parseMidiToSong(bufferRef.current, title || "Song", { trackIndices: indices });
    setSelected(indices);
    setParsed(result);
    if (wasPlaying) playPreviewFrom(result.song, posMs);
  }

  function toggleTrack(index: number) {
    const next = selected.includes(index)
      ? selected.filter((i) => i !== index)
      : [...selected, index].sort((a, b) => a - b);
    if (next.length === 0) return; // keep at least one track selected
    reparse(next);
  }

  async function save() {
    if (!parsed) return;
    stopPreview();
    const finalTitle = title.trim() || "My Song";
    const song: Song = {
      ...parsed.song,
      title: finalTitle,
      id: `user-${slug(finalTitle)}`,
    };
    await saveUserSong(song);
    navigate(`/play/${song.id}`);
  }

  const notes = song?.notes ?? [];
  const range = useMemo(() => {
    if (!notes.length) return { low: 60, high: 72 };
    const lo = Math.min(...notes.map((n) => n.midi));
    const hi = Math.max(...notes.map((n) => n.midi));
    return { low: lo - 2, high: hi + 2 };
  }, [notes]);

  return (
    <div className="import">
      <h2>Add a Song 🎼</h2>
      <p className="import__intro">
        Import a <strong>MIDI (.mid)</strong> file from your computer. Tick the
        part(s) you want, watch and hear a preview, then save. Your song stays on
        this device.
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

          {/* Scrolling notes preview */}
          <div className="import__rain">
            <NoteRainView
              notes={notes}
              lowMidi={range.low}
              highMidi={range.high}
              bpm={song.bpm}
              getTimeMs={getTimeMs}
              showKeyLabels={false}
            />
          </div>
          <ScrubBar progress={previewPct} totalMs={songTotalMs(song)} onSeek={seekPreview} />

          <div className="import__stats">
            <span>{notes.length} notes</span>
            <span>Level {song.level}</span>
            <span>{song.bpm} bpm</span>
          </div>

          {parsed.tracks.length > 1 && (
            <fieldset className="import__tracks">
              <legend>Which part(s) to play?</legend>
              {parsed.tracks.map((t) => (
                <label key={t.index} className="import__track">
                  <input
                    type="checkbox"
                    checked={selected.includes(t.index)}
                    onChange={() => toggleTrack(t.index)}
                  />
                  <span className="import__track-name">
                    {t.name || `Track ${t.index + 1}`}
                  </span>
                  <span className="import__track-meta">
                    {t.noteCount} notes · {midiToName(t.lowPitch)}–{midiToName(t.highPitch)}
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <div className="import__actions">
            {previewing ? (
              <BigButton variant="ghost" icon="⏹" onClick={stopPreview}>
                Stop
              </BigButton>
            ) : (
              <BigButton
                variant="ghost"
                icon="▶️"
                onClick={() => playPreview(song)}
                disabled={notes.length === 0}
              >
                Preview
              </BigButton>
            )}
            <BigButton variant="secondary" icon="💾" onClick={save}>
              Save & play
            </BigButton>
          </div>

          <p className="import__hint">
            Tip: tick one part for a clean melody, or several to hear them
            together. If it sounds wrong, try a different part.
          </p>
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

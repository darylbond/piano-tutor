import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Song } from "@/engine/types";
import { loadSong, songLengthBeats } from "@/library/catalog";
import { TransportClock } from "@/engine/clock";
import { Synth } from "@/engine/synth";
import { beatsToMs } from "@/engine/music";
import { NoteRainView } from "@/ui/components/NoteRainView";
import { BigButton } from "@/ui/components/BigButton";
import { useSettings } from "@/store/settings";
import "./PlayScreen.css";

type Status = "loading" | "ready" | "playing" | "done" | "error";

export function PlayScreen() {
  const { songId } = useParams<{ songId: string }>();
  const [song, setSong] = useState<Song | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string>("");

  const showKeyLabels = useSettings((s) => s.showKeyLabels);
  const tempoScale = useSettings((s) => s.tempoScale);
  const setTempoScale = useSettings((s) => s.setTempoScale);

  const clockRef = useRef(new TransportClock());
  const synthRef = useRef(new Synth());
  const endMsRef = useRef(0);

  useEffect(() => {
    if (!songId) return;
    setStatus("loading");
    loadSong(songId)
      .then((s) => {
        setSong(s);
        const lengthBeats = songLengthBeats(s.notes);
        endMsRef.current = beatsToMs(lengthBeats, s.bpm);
        setStatus("ready");
      })
      .catch((e) => {
        setError(String(e));
        setStatus("error");
      });
  }, [songId]);

  // Stop audio when leaving the screen.
  useEffect(() => {
    const synth = synthRef.current;
    return () => synth.stop();
  }, []);

  // Auto-stop at the end of the piece.
  useEffect(() => {
    if (status !== "playing") return;
    const id = window.setInterval(() => {
      if (clockRef.current.now() >= endMsRef.current + 400) {
        clockRef.current.pause();
        setStatus("done");
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [status]);

  const rate = tempoScale;

  const getTimeMs = useMemo(() => () => clockRef.current.now(), []);

  function handleListen() {
    if (!song) return;
    const clock = clockRef.current;
    clock.reset();
    clock.setRate(1);
    synthRef.current.setVolume(useSettings.getState().volume);
    synthRef.current.playSong(song.notes, song.bpm, 0, rate);
    // Align the visual clock to "now" and run at the chosen rate.
    clock.setRate(rate);
    clock.seek(0);
    clock.start();
    setStatus("playing");
  }

  function handleStop() {
    synthRef.current.stop();
    clockRef.current.pause();
    setStatus("ready");
  }

  function handleRestart() {
    handleStop();
    handleListen();
  }

  if (status === "error") {
    return (
      <div className="play play--message">
        <p>Couldn't load this song. {error}</p>
        <Link to="/library">← Back to songs</Link>
      </div>
    );
  }

  if (!song) {
    return <div className="play play--message">Loading song…</div>;
  }

  const low = Math.min(...song.notes.map((n) => n.midi)) - 2;
  const high = Math.max(...song.notes.map((n) => n.midi)) + 2;

  return (
    <div className="play">
      <div className="play__head">
        <Link to="/library" className="play__back">← Songs</Link>
        <div className="play__titles">
          <h2 className="play__title">{song.title}</h2>
          <span className="play__composer">{song.composer}</span>
        </div>
        <span className="play__level">{"⭐".repeat(song.level)}</span>
      </div>

      <NoteRainView
        notes={song.notes}
        lowMidi={low}
        highMidi={high}
        bpm={song.bpm}
        getTimeMs={getTimeMs}
        showKeyLabels={showKeyLabels}
      />

      <div className="play__controls">
        {status === "playing" ? (
          <>
            <BigButton variant="secondary" size="lg" icon="⏸" onClick={handleStop}>
              Stop
            </BigButton>
            <BigButton variant="ghost" icon="⏮" onClick={handleRestart}>
              Restart
            </BigButton>
          </>
        ) : (
          <BigButton variant="primary" size="lg" icon="▶" onClick={handleListen}>
            {status === "done" ? "Play again" : "Listen"}
          </BigButton>
        )}
      </div>

      <div className="play__tempo">
        <label htmlFor="tempo">Speed: {Math.round(tempoScale * 100)}%</label>
        <input
          id="tempo"
          type="range"
          min={0.5}
          max={1}
          step={0.05}
          value={tempoScale}
          onChange={(e) => setTempoScale(Number(e.target.value))}
        />
      </div>

      <p className="play__hint">
        ▶ <strong>Listen</strong> plays the song so you can watch the notes fall.
        Soon you'll play along on your own piano and the app will listen back!
      </p>
    </div>
  );
}

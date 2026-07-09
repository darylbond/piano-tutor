import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Song, NoteVerdict } from "@/engine/types";
import { loadSong, songLengthBeats } from "@/library/catalog";
import { TransportClock } from "@/engine/clock";
import { Synth } from "@/engine/synth";
import { WaitModeMatcher } from "@/engine/matcher";
import { beatsToMs } from "@/engine/music";
import { NoteRainView } from "@/ui/components/NoteRainView";
import { BigButton } from "@/ui/components/BigButton";
import { MicButton } from "@/ui/components/MicButton";
import { MicNoteInput } from "@/audio/mic";
import { NoteRainRenderer } from "@/engine/note-rain";
import { useSettings } from "@/store/settings";
import "./PlayScreen.css";

type Mode = "idle" | "listen" | "along" | "done";

export function PlayScreen() {
  const { songId } = useParams<{ songId: string }>();
  const [song, setSong] = useState<Song | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string>("");
  const [progressPct, setProgressPct] = useState(0);

  const showKeyLabels = useSettings((s) => s.showKeyLabels);
  const tempoScale = useSettings((s) => s.tempoScale);
  const setTempoScale = useSettings((s) => s.setTempoScale);

  const clockRef = useRef(new TransportClock());
  const synthRef = useRef(new Synth());
  const matcherRef = useRef<WaitModeMatcher | null>(null);
  const micRef = useRef<MicNoteInput | null>(null);
  const rendererRef = useRef<NoteRainRenderer | null>(null);
  const [micOn, setMicOn] = useState(false);
  const endMsRef = useRef(0);
  const modeRef = useRef<Mode>("idle");
  modeRef.current = mode;

  // Lazily create the mic input once; dispose on unmount.
  if (!micRef.current) micRef.current = new MicNoteInput();
  useEffect(() => {
    const mic = micRef.current!;
    return () => mic.dispose();
  }, []);

  // For wait-mode: the displayed playhead eases toward the matcher's cursor.
  const displayMsRef = useRef(0);
  const targetMsRef = useRef(0);
  const verdictsRef = useRef<Map<number, NoteVerdict>>(new Map());

  useEffect(() => {
    if (!songId) return;
    setMode("idle");
    loadSong(songId)
      .then((s) => {
        setSong(s);
        endMsRef.current = beatsToMs(songLengthBeats(s.notes), s.bpm);
      })
      .catch((e) => setError(String(e)));
  }, [songId]);

  useEffect(() => {
    const synth = synthRef.current;
    return () => synth.stop();
  }, []);

  // Auto-stop Listen mode at the end of the piece.
  useEffect(() => {
    if (mode !== "listen") return;
    const id = window.setInterval(() => {
      const t = clockRef.current.now();
      setProgressPct(Math.min(100, (t / endMsRef.current) * 100));
      if (t >= endMsRef.current + 500) {
        clockRef.current.pause();
        setMode("done");
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [mode]);

  // The renderer calls this every frame; branch on the active mode.
  const getTimeMs = useCallback(() => {
    if (modeRef.current === "along") {
      // Ease the visible playhead toward the current cursor position.
      const target = targetMsRef.current;
      displayMsRef.current += (target - displayMsRef.current) * 0.18;
      return displayMsRef.current;
    }
    return clockRef.current.now();
  }, []);

  function startListen() {
    if (!song) return;
    matcherRef.current = null;
    verdictsRef.current = new Map();
    const clock = clockRef.current;
    synthRef.current.setVolume(useSettings.getState().volume);
    synthRef.current.playSong(song.notes, song.bpm, 0, tempoScale);
    clock.setRate(tempoScale);
    clock.seek(0);
    clock.start();
    setProgressPct(0);
    setMode("listen");
  }

  function startAlong() {
    if (!song) return;
    synthRef.current.stop();
    synthRef.current.ensureContext(); // unlock audio on this user gesture
    const matcher = new WaitModeMatcher(song.notes);
    matcherRef.current = matcher;
    verdictsRef.current = matcher.getVerdicts();
    displayMsRef.current = 0;
    targetMsRef.current = beatsToMs(matcher.cursorBeat(), song.bpm);
    setProgressPct(0);
    setMode("along");
  }

  function stopAll() {
    synthRef.current.stop();
    clockRef.current.pause();
    micRef.current?.stop();
    setMicOn(false);
    matcherRef.current = null;
    setMode("idle");
  }

  // Core note handler shared by the on-screen keyboard and the microphone.
  const handleNote = useCallback(
    (midi: number, opts: { audioFeedback: boolean; source: "keyboard" | "mic" }) => {
      const matcher = matcherRef.current;
      if (!song) return;
      // The on-screen keyboard makes its own sound; a real piano already did.
      if (opts.audioFeedback) synthRef.current.playNote(midi, 350);
      rendererRef.current?.lightKey(midi, getTimeMs());
      if (modeRef.current !== "along" || !matcher) return;

      const advanced = matcher.handleEvent({
        midi,
        timeMs: performance.now(),
        source: opts.source,
      });
      if (advanced) {
        if (matcher.isComplete()) {
          targetMsRef.current = endMsRef.current;
          setProgressPct(100);
          setMode("done");
        } else {
          targetMsRef.current = beatsToMs(matcher.cursorBeat(), song.bpm);
          const total = song.notes.length;
          const doneCount = [...matcher.getVerdicts().values()].filter(
            (v) => v === "hit",
          ).length;
          setProgressPct(Math.round((doneCount / total) * 100));
        }
      }
    },
    [song, getTimeMs],
  );

  const handleKeyPress = useCallback(
    (midi: number) => handleNote(midi, { audioFeedback: true, source: "keyboard" }),
    [handleNote],
  );

  // Route microphone onsets into the same matcher as taps.
  useEffect(() => {
    const mic = micRef.current!;
    const unsub = mic.subscribe((e) =>
      handleNote(e.midi, { audioFeedback: false, source: "mic" }),
    );
    return unsub;
  }, [handleNote]);

  if (error) {
    return (
      <div className="play play--message">
        <p>Couldn't load this song. {error}</p>
        <Link to="/library">← Back to songs</Link>
      </div>
    );
  }
  if (!song) return <div className="play play--message">Loading song…</div>;

  const low = Math.min(...song.notes.map((n) => n.midi)) - 2;
  const high = Math.max(...song.notes.map((n) => n.midi)) + 2;
  const playing = mode === "listen" || mode === "along";

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

      <div className="play__progress" aria-hidden="true">
        <div className="play__progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <NoteRainView
        notes={song.notes}
        lowMidi={low}
        highMidi={high}
        bpm={song.bpm}
        getTimeMs={getTimeMs}
        verdicts={verdictsRef.current}
        showKeyLabels={showKeyLabels}
        onKeyPress={handleKeyPress}
        rendererRef={(r) => (rendererRef.current = r)}
      />

      <div className="play__controls">
        {!playing ? (
          <>
            <BigButton variant="primary" size="lg" icon="▶" onClick={startListen}>
              {mode === "done" ? "Listen again" : "Listen"}
            </BigButton>
            <BigButton variant="secondary" size="lg" icon="🎹" onClick={startAlong}>
              Play along
            </BigButton>
          </>
        ) : (
          <BigButton variant="ghost" size="lg" icon="⏹" onClick={stopAll}>
            Stop
          </BigButton>
        )}
      </div>

      {mode === "along" && (
        <MicButton
          mic={micRef.current!}
          active={micOn}
          onToggle={setMicOn}
        />
      )}

      {mode === "done" && (
        <p className="play__cheer">🎉 Nice playing! Want to go again?</p>
      )}

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
          disabled={playing}
        />
      </div>

      <p className="play__hint">
        {mode === "along"
          ? "Tap the falling notes' keys on the keyboard (or play them on your piano). The cursor waits for you!"
          : "▶ Listen watches the song play. 🎹 Play along waits for you to play each note."}
      </p>
    </div>
  );
}

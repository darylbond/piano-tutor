import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Song, NoteVerdict } from "@/engine/types";
import { loadSong, songLengthBeats } from "@/library/catalog";
import { isExerciseId } from "@/lessons/exercises";
import { TransportClock } from "@/engine/clock";
import { Synth } from "@/engine/synth";
import { WaitModeMatcher } from "@/engine/matcher";
import { RhythmMatcher } from "@/engine/rhythm";
import { scorePlaythrough, type PlayResult } from "@/engine/scorer";
import { beatsToMs, msToBeats } from "@/engine/music";
import { NoteRainView } from "@/ui/components/NoteRainView";
import { BigButton } from "@/ui/components/BigButton";
import { MicButton } from "@/ui/components/MicButton";
import { ReportCard } from "@/ui/components/ReportCard";
import { MicNoteInput } from "@/audio/mic";
import { MidiNoteInput } from "@/audio/midi";
import { NoteRainRenderer } from "@/engine/note-rain";
import { useSettings } from "@/store/settings";
import { useProgress } from "@/store/progress";
import "./PlayScreen.css";

type Mode = "idle" | "listen" | "along" | "rhythm" | "done";

export function PlayScreen() {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const [song, setSong] = useState<Song | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string>("");
  const [progressPct, setProgressPct] = useState(0);
  const [result, setResult] = useState<PlayResult | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const recordPlay = useProgress((s) => s.recordPlay);

  const showKeyLabels = useSettings((s) => s.showKeyLabels);
  const tempoScale = useSettings((s) => s.tempoScale);
  const setTempoScale = useSettings((s) => s.setTempoScale);

  const clockRef = useRef(new TransportClock());
  const synthRef = useRef(new Synth());
  const matcherRef = useRef<WaitModeMatcher | null>(null);
  const rhythmRef = useRef<RhythmMatcher | null>(null);
  const lastBeatRef = useRef<number>(-999);
  const lastModeRef = useRef<"along" | "rhythm">("along");
  const micRef = useRef<MicNoteInput | null>(null);
  const midiRef = useRef<MidiNoteInput | null>(null);
  const rendererRef = useRef<NoteRainRenderer | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [midiDevice, setMidiDevice] = useState<string | null>(null);
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

  // Rhythm mode: the clock runs; grade timing, click the metronome, mark misses.
  useEffect(() => {
    if (mode !== "rhythm" || !song) return;
    const id = window.setInterval(() => {
      const rhythm = rhythmRef.current;
      if (!rhythm) return;
      const t = clockRef.current.now();

      // Metronome: click once per beat (including the count-in's negative beats).
      const beat = Math.floor(msToBeats(t, song.bpm));
      if (beat !== lastBeatRef.current) {
        lastBeatRef.current = beat;
        synthRef.current.playNote(beat % song.beatsPerMeasure === 0 ? 84 : 79, 60);
      }

      rhythm.update(t);
      rendererRef.current?.setVerdicts(rhythm.getVerdicts());
      setProgressPct(Math.min(100, Math.max(0, (t / endMsRef.current) * 100)));

      if (t >= endMsRef.current + 600) finishRun(rhythm.getVerdicts());
    }, 60);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, song]);

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
    setResult(null);
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
    setResult(null);
    synthRef.current.stop();
    synthRef.current.ensureContext(); // unlock audio on this user gesture
    const matcher = new WaitModeMatcher(song.notes);
    matcherRef.current = matcher;
    verdictsRef.current = matcher.getVerdicts();
    displayMsRef.current = 0;
    targetMsRef.current = beatsToMs(matcher.cursorBeat(), song.bpm);
    lastModeRef.current = "along";
    setProgressPct(0);
    setMode("along");
  }

  function startRhythm() {
    if (!song) return;
    setResult(null);
    synthRef.current.stop();
    synthRef.current.ensureContext();
    synthRef.current.setVolume(useSettings.getState().volume);
    const rhythm = new RhythmMatcher(song.notes, song.bpm);
    rhythmRef.current = rhythm;
    matcherRef.current = null;
    verdictsRef.current = rhythm.getVerdicts();
    // One-bar count-in: start the clock before beat 0 so kids can find the beat.
    const countInMs = beatsToMs(song.beatsPerMeasure, song.bpm);
    lastBeatRef.current = -999;
    const clock = clockRef.current;
    clock.setRate(tempoScale);
    clock.seek(-countInMs);
    clock.start();
    lastModeRef.current = "rhythm";
    setProgressPct(0);
    setMode("rhythm");
  }

  function stopAll() {
    synthRef.current.stop();
    clockRef.current.pause();
    micRef.current?.stop();
    setMicOn(false);
    matcherRef.current = null;
    rhythmRef.current = null;
    setMode("idle");
  }

  // Core note handler shared by the on-screen keyboard and the microphone.
  const handleNote = useCallback(
    (midi: number, opts: { audioFeedback: boolean; source: "keyboard" | "mic" | "midi" }) => {
      const matcher = matcherRef.current;
      if (!song) return;
      // The on-screen keyboard makes its own sound; a real piano already did.
      if (opts.audioFeedback) synthRef.current.playNote(midi, 350);
      rendererRef.current?.lightKey(midi);

      // Rhythm mode: grade timing against the running clock.
      if (modeRef.current === "rhythm" && rhythmRef.current) {
        rhythmRef.current.handleEvent(
          { midi, timeMs: performance.now(), source: opts.source },
          clockRef.current.now(),
        );
        rendererRef.current?.setVerdicts(rhythmRef.current.getVerdicts());
        return;
      }

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
          finishRun(matcher.getVerdicts());
        } else {
          targetMsRef.current = beatsToMs(matcher.cursorBeat(), song.bpm);
          const total = song.notes.length;
          const doneCount = [...matcher.getVerdicts().values()].filter(
            (v) => v === "hit" || v === "close",
          ).length;
          setProgressPct(Math.round((doneCount / total) * 100));
        }
      }
    },
    [song, getTimeMs],
  );

  // Score a completed run (wait or rhythm), persist it, and show the report card.
  function finishRun(verdicts: Map<number, NoteVerdict>) {
    if (!song) return;
    const scored = song.notes.map((n) => ({
      verdict: verdicts.get(n.id) ?? "missed",
      measure: n.measure,
    }));
    const r = scorePlaythrough(scored);
    const prevBest = useProgress.getState().getProgress(song.id)?.bestStars ?? 0;
    setIsNewBest(r.stars > prevBest);
    recordPlay(song.id, { stars: r.stars, accuracy: r.accuracy }, Date.now());
    micRef.current?.stop();
    setMicOn(false);
    rhythmRef.current = null;
    matcherRef.current = null;
    setResult(r);
    setMode("done");
  }

  const handleKeyPress = useCallback(
    (midi: number) => handleNote(midi, { audioFeedback: true, source: "keyboard" }),
    [handleNote],
  );

  // Keep a stable reference to the latest handler so input subscriptions can be
  // set up once on mount without re-requesting devices when the song changes.
  const handleNoteRef = useRef(handleNote);
  handleNoteRef.current = handleNote;

  // Route microphone onsets into the same matcher as taps.
  useEffect(() => {
    const mic = micRef.current!;
    return mic.subscribe((e) =>
      handleNoteRef.current(e.midi, { audioFeedback: false, source: "mic" }),
    );
  }, []);

  // Auto-detect a MIDI piano and route its notes into the matcher too.
  useEffect(() => {
    if (!MidiNoteInput.isSupported()) return;
    const midi = new MidiNoteInput();
    midiRef.current = midi;
    let unsub: (() => void) | undefined;
    const setDevice = (a: boolean) =>
      setMidiDevice(a ? midi.deviceNames()[0] ?? "MIDI piano" : null);
    midi
      .listen()
      .then((available) => {
        setDevice(available);
        midi.onAvailability(setDevice);
        unsub = midi.subscribe((e) =>
          handleNoteRef.current(e.midi, { audioFeedback: true, source: "midi" }),
        );
      })
      .catch(() => setMidiDevice(null));
    return () => {
      unsub?.();
      midi.dispose();
      midiRef.current = null;
    };
  }, []);

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
  const playing = mode === "listen" || mode === "along" || mode === "rhythm";
  const usingMic = mode === "along" || mode === "rhythm";
  const showReport = mode === "done" && result;
  const isExercise = isExerciseId(song.id);
  const backTo = isExercise ? "/practice" : "/library";

  return (
    <div className="play">
      <div className="play__head">
        <Link to={backTo} className="play__back">
          ← {isExercise ? "Practice" : "Songs"}
        </Link>
        <div className="play__titles">
          <h2 className="play__title">{song.title}</h2>
          <span className="play__composer">{song.composer}</span>
        </div>
        <span className="play__level">{"⭐".repeat(song.level)}</span>
      </div>

      {midiDevice && (
        <div className="play__midi" title={midiDevice}>
          🎹 Piano connected: {midiDevice}
        </div>
      )}

      {showReport ? (
        <div className="play__report-wrap">
          <ReportCard
            result={result}
            isNewBest={isNewBest}
            onPlayAgain={lastModeRef.current === "rhythm" ? startRhythm : startAlong}
            onBackToLibrary={() => navigate(backTo)}
          />
        </div>
      ) : (
        <>
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

          <div className="play__bar">
            <div className="play__controls">
              {!playing ? (
                <>
                  <BigButton variant="primary" icon="▶" onClick={startListen}>
                    {mode === "done" ? "Listen again" : "Listen"}
                  </BigButton>
                  <BigButton variant="secondary" icon="🎹" onClick={startAlong}>
                    Play along
                  </BigButton>
                  <BigButton variant="ghost" icon="🥁" onClick={startRhythm}>
                    Keep the beat
                  </BigButton>
                </>
              ) : (
                <BigButton variant="ghost" icon="⏹" onClick={stopAll}>
                  Stop
                </BigButton>
              )}
            </div>

            <label className="play__tempo">
              <span>Speed {Math.round(tempoScale * 100)}%</span>
              <input
                type="range"
                min={0.5}
                max={1}
                step={0.05}
                value={tempoScale}
                onChange={(e) => setTempoScale(Number(e.target.value))}
                disabled={playing}
                aria-label="Playback speed"
              />
            </label>
          </div>

          {usingMic && (
            <MicButton mic={micRef.current!} active={micOn} onToggle={setMicOn} />
          )}
        </>
      )}
    </div>
  );
}

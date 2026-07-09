import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MicNoteInput, type MicLevel } from "@/audio/mic";
import { sensitivityToThresholds, useSettings } from "@/store/settings";
import { midiToName } from "@/engine/music";
import { BigButton } from "@/ui/components/BigButton";
import { Mascot } from "@/ui/components/Mascot";
import "./CalibrateScreen.css";

type Phase = "intro" | "quiet" | "play" | "done" | "error";

/** Median of a numeric array (0 for empty). */
function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function CalibrateScreen() {
  const navigate = useNavigate();
  const setMicSensitivity = useSettings((s) => s.setMicSensitivity);
  const setTuningCents = useSettings((s) => s.setTuningCents);
  const setMicCalibrated = useSettings((s) => s.setMicCalibrated);

  const micRef = useRef<MicNoteInput | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [level, setLevel] = useState<MicLevel>({ rms: 0, clarity: 0, midi: null, cents: null });
  const [result, setResult] = useState<{ sensitivity: number; cents: number } | null>(null);

  // Collected samples per phase.
  const noiseSamples = useRef<number[]>([]);
  const noteRmsSamples = useRef<number[]>([]);
  const centsSamples = useRef<number[]>([]);
  const phaseRef = useRef<Phase>("intro");
  phaseRef.current = phase;

  useEffect(() => {
    return () => micRef.current?.dispose();
  }, []);

  async function begin() {
    const mic = new MicNoteInput();
    micRef.current = mic;
    mic.onLevelUpdate((l) => {
      setLevel(l);
      if (phaseRef.current === "quiet") noiseSamples.current.push(l.rms);
      else if (phaseRef.current === "play") {
        if (l.rms > 0.01) noteRmsSamples.current.push(l.rms);
        if (l.cents != null && l.clarity > 0.95) centsSamples.current.push(l.cents);
      }
    });
    try {
      await mic.start();
      setPhase("quiet");
    } catch {
      setPhase("error");
    }
  }

  function finishQuiet() {
    setPhase("play");
  }

  function finishPlay() {
    // Noise floor: high end of quiet-room RMS. Note level: median of played peaks.
    const noiseFloor = noiseSamples.current.length
      ? noiseSamples.current.sort((a, b) => a - b)[
          Math.floor(noiseSamples.current.length * 0.9)
        ]
      : 0.01;
    const noteLevel = median(noteRmsSamples.current) || 0.05;

    // Put the onset threshold comfortably above noise but below a played note.
    const attack = Math.min(
      Math.max(noiseFloor * 1.8, 0.006),
      Math.max(noteLevel * 0.4, 0.008),
    );
    // Invert sensitivityToThresholds: attack = 0.004 + (1-s)*0.05.
    const sensitivity = Math.min(1, Math.max(0, 1 - (attack - 0.004) / 0.05));
    const cents = Math.round(median(centsSamples.current));

    micRef.current?.stop();
    setMicSensitivity(sensitivity);
    setTuningCents(cents);
    setMicCalibrated(true);
    setResult({ sensitivity, cents });
    setPhase("done");

    // Sanity note for the debug-minded: thresholds we picked.
    void sensitivityToThresholds(sensitivity);
  }

  const meterPct = Math.min(100, Math.round(level.rms * 600));

  return (
    <div className="cal">
      <Mascot mood={phase === "done" ? "cheer" : "wave"} size={110} />

      {phase === "intro" && (
        <>
          <h2>Let's tune your ears! 🎤</h2>
          <p>
            I'll listen to your piano so I can hear you play. This takes about
            20 seconds. Ready?
          </p>
          <BigButton variant="primary" size="lg" onClick={begin}>
            Start
          </BigButton>
        </>
      )}

      {phase === "error" && (
        <>
          <h2>I couldn't hear the microphone</h2>
          <p>Please allow microphone access, then try again.</p>
          <BigButton variant="primary" onClick={() => setPhase("intro")}>
            Try again
          </BigButton>
        </>
      )}

      {phase === "quiet" && (
        <>
          <h2>Shhh… stay quiet 🤫</h2>
          <p>Don't play anything for a moment so I can learn how quiet your room is.</p>
          <Meter pct={meterPct} />
          <BigButton variant="primary" size="lg" onClick={finishQuiet}>
            OK, it's quiet
          </BigButton>
        </>
      )}

      {phase === "play" && (
        <>
          <h2>Now play some notes! 🎹</h2>
          <p>
            Play a few notes on your piano — middle C is perfect. Play them a
            few times.
          </p>
          <Meter pct={meterPct} />
          <p className="cal__hearing">
            {level.midi != null ? `I hear: ${midiToName(level.midi)}` : "…listening…"}
          </p>
          <BigButton variant="primary" size="lg" onClick={finishPlay}>
            All done
          </BigButton>
        </>
      )}

      {phase === "done" && result && (
        <>
          <h2>All set! 🎉</h2>
          <p>
            I've tuned my listening to your piano
            {Math.abs(result.cents) >= 8
              ? ` (it's ${result.cents > 0 ? "a little sharp" : "a little flat"}, I'll adjust).`
              : "."}
          </p>
          <div className="cal__actions">
            <BigButton variant="primary" size="lg" onClick={() => navigate("/library")}>
              Let's play!
            </BigButton>
            <BigButton variant="ghost" onClick={() => { noiseSamples.current = []; noteRmsSamples.current = []; centsSamples.current = []; setPhase("intro"); }}>
              Redo
            </BigButton>
          </div>
        </>
      )}
    </div>
  );
}

function Meter({ pct }: { pct: number }) {
  return (
    <div className="cal__meter" aria-hidden="true">
      <div className="cal__meter-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { MicNoteInput, type MicLevel } from "@/audio/mic";
import { midiToName } from "@/engine/music";
import { Link } from "react-router-dom";
import { useSettings, sensitivityToThresholds } from "@/store/settings";
import "./MicButton.css";

interface MicButtonProps {
  mic: MicNoteInput;
  /** Reflects whether listening is currently on. */
  active: boolean;
  onToggle: (on: boolean) => void;
}

/**
 * Turns the microphone on/off and shows a live level meter so a child can see
 * that the app is hearing their piano — the single most important bit of
 * feedback for trust (PLAN §4.4). Never leaves the user staring at a dead UI.
 */
export function MicButton({ mic, active, onToggle }: MicButtonProps) {
  const [level, setLevel] = useState<MicLevel>({ rms: 0, clarity: 0, midi: null, cents: null });
  const [error, setError] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const micSensitivity = useSettings((s) => s.micSensitivity);
  const setMicSensitivity = useSettings((s) => s.setMicSensitivity);
  const tuningCents = useSettings((s) => s.tuningCents);

  // Apply sensitivity + tuning offset to the (possibly running) mic.
  useEffect(() => {
    mic.setConfig({ ...sensitivityToThresholds(micSensitivity), tuningCents });
  }, [mic, micSensitivity, tuningCents]);

  useEffect(() => {
    if (!active) return;
    mic.onLevelUpdate((l) => {
      setLevel(l);
      // Update the meter width imperatively to avoid re-rendering every frame.
      if (barRef.current) {
        const pct = Math.min(100, Math.round(l.rms * 600));
        barRef.current.style.width = `${pct}%`;
      }
    });
    return () => mic.onLevelUpdate(null);
  }, [active, mic]);

  async function handleClick() {
    setError(null);
    if (active) {
      mic.stop();
      onToggle(false);
      return;
    }
    try {
      await mic.start();
      onToggle(true);
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "I need permission to hear your piano. Please allow the microphone."
          : "Couldn't start the microphone.",
      );
    }
  }

  return (
    <div className="mic">
      <button
        className={`mic__toggle ${active ? "mic__toggle--on" : ""}`}
        onClick={handleClick}
      >
        <span aria-hidden="true">{active ? "🔴" : "🎤"}</span>
        {active ? "Listening…" : "Turn on microphone"}
      </button>

      {active && (
        <div className="mic__meter" aria-hidden="true">
          <div className="mic__meter-bar" ref={barRef} />
        </div>
      )}
      {active && (
        <span className="mic__hint">
          {level.midi != null ? `I hear: ${midiToName(level.midi)}` : "Play a note!"}
        </span>
      )}
      {active && (
        <label className="mic__sens">
          <span aria-hidden="true">🔈</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={micSensitivity}
            onChange={(e) => setMicSensitivity(Number(e.target.value))}
            aria-label="Microphone sensitivity"
          />
          <span aria-hidden="true">🔊</span>
        </label>
      )}
      {error && <span className="mic__error">{error}</span>}
      <Link to="/calibrate" className="mic__tune">Tune microphone</Link>
    </div>
  );
}

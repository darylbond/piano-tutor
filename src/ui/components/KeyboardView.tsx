import { useMemo } from "react";
import { buildKeyboard } from "@/engine/keyboard";
import { isWhiteKey, midiToPitchClassName } from "@/engine/music";
import "./KeyboardView.css";

interface KeyboardViewProps {
  lowMidi: number;
  highMidi: number;
  /** Keys to highlight as "play me" targets. */
  highlight?: Set<number>;
  /** Keys to show as correctly played. */
  correct?: Set<number>;
  showLabels?: boolean;
  onPress?: (midi: number) => void;
}

/**
 * An accessible HTML/CSS piano keyboard (real buttons), used by lessons where a
 * child needs to find and press specific keys. Distinct from the canvas keyboard
 * inside Note Rain: here each key is a focusable control with a label, which is
 * better for guided, tap-one-key learning and for screen readers.
 */
export function KeyboardView({
  lowMidi,
  highMidi,
  highlight,
  correct,
  showLabels = true,
  onPress,
}: KeyboardViewProps) {
  const kb = useMemo(() => buildKeyboard(lowMidi, highMidi), [lowMidi, highMidi]);
  const whites = kb.keys.filter((k) => k.white);
  const blacks = kb.keys.filter((k) => !k.white);

  function classFor(midi: number, base: string) {
    const cls = [base];
    if (highlight?.has(midi)) cls.push(`${base}--target`);
    if (correct?.has(midi)) cls.push(`${base}--correct`);
    return cls.join(" ");
  }

  return (
    <div className="kbd">
      <div className="kbd__whites">
        {whites.map((k) => {
          const isC = k.midi % 12 === 0;
          return (
            <button
              key={k.midi}
              className={classFor(k.midi, "kbd__white")}
              onPointerDown={() => onPress?.(k.midi)}
              aria-label={midiToPitchClassName(k.midi)}
            >
              {showLabels && (
                <span className="kbd__label">
                  {midiToPitchClassName(k.midi)}
                  {isC ? Math.floor(k.midi / 12) - 1 : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="kbd__blacks">
        {blacks.map((k) => (
          <button
            key={k.midi}
            className={classFor(k.midi, "kbd__black")}
            style={{ left: `${k.cx * 100}%` }}
            onPointerDown={() => onPress?.(k.midi)}
            aria-label={`${midiToPitchClassName(k.midi)} sharp`}
          />
        ))}
      </div>
    </div>
  );
}

/** Helper: does this keyboard include the given note? */
export function keyboardHas(lowMidi: number, highMidi: number, midi: number): boolean {
  return midi >= lowMidi && midi <= highMidi && (isWhiteKey(midi) || true);
}

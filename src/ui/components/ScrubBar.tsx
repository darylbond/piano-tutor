import { useRef, useState } from "react";
import "./ScrubBar.css";

interface ScrubBarProps {
  /** Playhead position as a fraction 0..1. */
  progress: number;
  /** Called with a fraction 0..1 when the user seeks (drag or click). */
  onSeek?: (fraction: number) => void;
  /** Total length in ms, for the time read-out (optional). */
  totalMs?: number;
  disabled?: boolean;
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * A seekable progress bar. While the user drags, it shows the dragged position
 * (so it doesn't fight the live playhead); on release it commits via onSeek.
 */
export function ScrubBar({ progress, onSeek, totalMs, disabled }: ScrubBarProps) {
  const [drag, setDrag] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const shown = drag ?? Math.min(1, Math.max(0, progress));

  function fractionAt(clientX: number): number {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }

  function onPointerDown(e: React.PointerEvent) {
    if (disabled || !onSeek) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(fractionAt(e.clientX));
  }
  function onPointerMove(e: React.PointerEvent) {
    if (drag == null) return;
    setDrag(fractionAt(e.clientX));
  }
  function onPointerUp(e: React.PointerEvent) {
    if (drag == null) return;
    const f = fractionAt(e.clientX);
    setDrag(null);
    onSeek?.(f);
  }

  return (
    <div className={`scrub${disabled ? " scrub--disabled" : ""}`}>
      <div
        ref={trackRef}
        className="scrub__track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(shown * 100)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled || !onSeek) return;
          if (e.key === "ArrowLeft") onSeek(Math.max(0, shown - 0.05));
          if (e.key === "ArrowRight") onSeek(Math.min(1, shown + 0.05));
        }}
      >
        <div className="scrub__fill" style={{ width: `${shown * 100}%` }} />
        <div className="scrub__thumb" style={{ left: `${shown * 100}%` }} />
      </div>
      {totalMs != null && (
        <div className="scrub__time">
          <span>{fmt(shown * totalMs)}</span>
          <span>{fmt(totalMs)}</span>
        </div>
      )}
    </div>
  );
}

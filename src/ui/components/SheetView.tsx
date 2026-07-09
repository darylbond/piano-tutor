import { useEffect, useMemo, useRef } from "react";
import type { ScoreNote, NoteVerdict } from "@/engine/types";
import { staffStep, needsSharp, ledgerLines } from "@/engine/staff";
import { midiToPitchClassName, msToBeats } from "@/engine/music";
import "./SheetView.css";

interface SheetViewProps {
  notes: ScoreNote[];
  bpm: number;
  getTimeMs: () => number;
  verdicts?: Map<number, NoteVerdict>;
  showLetters?: boolean;
}

// Geometry (SVG user units).
const H = 220;
const HALF = 7; // half a staff-space
const BOTTOM_LINE_Y = 132; // y of the bottom staff line (E4, staff step 0)
const CURSOR_X = 150; // fixed screen x where "now" sits
const PX_PER_BEAT = 66;

const yForStep = (step: number) => BOTTOM_LINE_Y - step * HALF;
const COLOR = {
  right: "#3a6fd8",
  left: "#f2820c",
  hit: "#46c98b",
  close: "#f2a900",
};

export function SheetView({ notes, bpm, getTimeMs, verdicts, showLetters = true }: SheetViewProps) {
  const layerRef = useRef<SVGGElement>(null);
  const headRefs = useRef<Map<number, SVGGElement>>(new Map());
  // Last color written per notehead, so we only touch the DOM when it changes
  // (verdicts change a few times per second, not 60×).
  const lastColor = useRef<Map<number, string>>(new Map());
  const getTimeRef = useRef(getTimeMs);
  getTimeRef.current = getTimeMs;
  const verdictsRef = useRef(verdicts);
  verdictsRef.current = verdicts;

  // A new song remounts noteheads; drop the stale color cache so the first
  // frame repaints them.
  useEffect(() => {
    lastColor.current.clear();
  }, [notes]);

  const layout = useMemo(() => {
    return notes.map((n) => {
      const step = staffStep(n.midi);
      return {
        note: n,
        x: n.startBeat * PX_PER_BEAT,
        y: yForStep(step),
        step,
        sharp: needsSharp(n.midi),
        ledgers: ledgerLines(step),
        letter: midiToPitchClassName(n.midi),
      };
    });
  }, [notes]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const nowBeat = msToBeats(getTimeRef.current(), bpm);
      const tx = CURSOR_X - nowBeat * PX_PER_BEAT;
      if (layerRef.current) {
        // translate3d hints the compositor to scroll this layer rather than
        // repaint the whole staff each frame.
        layerRef.current.style.transform = `translate3d(${tx}px, 0, 0)`;
      }
      // Recolor noteheads by verdict — but only write to the DOM when a color
      // actually changes, so a steady frame does zero style work.
      const v = verdictsRef.current;
      const cache = lastColor.current;
      for (const [id, el] of headRefs.current) {
        const verdict = v?.get(id);
        let color: string;
        if (verdict === "hit") color = COLOR.hit;
        else if (verdict === "close") color = COLOR.close;
        else {
          const hand = el.dataset.hand as "left" | "right";
          color = hand === "left" ? COLOR.left : COLOR.right;
        }
        if (cache.get(id) !== color) {
          el.style.color = color;
          cache.set(id, color);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [bpm]);

  return (
    <div className="sheet">
      <svg
        className="sheet__svg"
        viewBox={`0 0 900 ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Sheet music"
      >
        {/* Static staff + clef + cursor (screen space). */}
        <g className="sheet__staff">
          {[0, 2, 4, 6, 8].map((s) => (
            <line key={s} x1={40} x2={900} y1={yForStep(s)} y2={yForStep(s)} />
          ))}
          <text className="sheet__clef" x={44} y={yForStep(2) + 20}>
            𝄞
          </text>
        </g>

        {/* Moving notes. */}
        <g ref={layerRef} style={{ willChange: "transform" }}>
          {layout.map((l) => (
            <g
              key={l.note.id}
              ref={(el) => {
                if (el) headRefs.current.set(l.note.id, el);
                else headRefs.current.delete(l.note.id);
              }}
              data-hand={l.note.hand}
              className="sheet__note"
            >
              {l.ledgers.map((s) => (
                <line
                  key={s}
                  className="sheet__ledger"
                  x1={l.x - 12}
                  x2={l.x + 12}
                  y1={yForStep(s)}
                  y2={yForStep(s)}
                />
              ))}
              {l.sharp && (
                <text className="sheet__sharp" x={l.x - 20} y={l.y + 5}>
                  ♯
                </text>
              )}
              <ellipse cx={l.x} cy={l.y} rx={8} ry={6} />
              {showLetters && (
                <text className="sheet__letter" x={l.x} y={l.y + 3}>
                  {l.letter}
                </text>
              )}
            </g>
          ))}
        </g>

        {/* Left mask hides notes scrolling past the clef. */}
        <rect x={0} y={0} width={38} height={H} className="sheet__mask" />
        {/* Cursor stays put; notes scroll under it. */}
        <line
          className="sheet__cursor"
          x1={CURSOR_X}
          x2={CURSOR_X}
          y1={yForStep(9)}
          y2={yForStep(-3)}
        />
      </svg>
    </div>
  );
}

import { useEffect, useRef } from "react";
import type { ScoreNote, NoteVerdict } from "@/engine/types";
import { NoteRainRenderer } from "@/engine/note-rain";
import "./NoteRainView.css";

interface NoteRainViewProps {
  notes: ScoreNote[];
  lowMidi: number;
  highMidi: number;
  bpm: number;
  /** Returns the current playhead position in ms; called every frame. */
  getTimeMs: () => number;
  verdicts?: Map<number, NoteVerdict>;
  showKeyLabels?: boolean;
  /** Show the on-canvas frame-time overlay. */
  debug?: boolean;
  /** Imperative handle so parents can flash keys on live input. */
  rendererRef?: (r: NoteRainRenderer | null) => void;
  /** Called when the user taps a key on the on-screen keyboard. */
  onKeyPress?: (midi: number) => void;
}

export function NoteRainView({
  notes,
  lowMidi,
  highMidi,
  bpm,
  getTimeMs,
  verdicts,
  showKeyLabels = true,
  debug = false,
  rendererRef,
  onKeyPress,
}: NoteRainViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererObj = useRef<NoteRainRenderer | null>(null);
  // Keep the latest callbacks without re-creating the animation loop.
  const getTimeRef = useRef(getTimeMs);
  getTimeRef.current = getTimeMs;
  const onKeyPressRef = useRef(onKeyPress);
  onKeyPressRef.current = onKeyPress;
  const debugRef = useRef(debug);
  debugRef.current = debug;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new NoteRainRenderer(canvas, {
      lowMidi,
      highMidi,
      bpm,
      showKeyLabels,
    });
    renderer.setDebug(debugRef.current);
    rendererObj.current = renderer;
    rendererRef?.(renderer);

    const ro = new ResizeObserver(() => renderer.resize());
    ro.observe(canvas);

    const handlePointerDown = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const midi = renderer.keyAt(ev.clientX - rect.left, ev.clientY - rect.top);
      if (midi != null) {
        renderer.lightKey(midi);
        onKeyPressRef.current?.(midi);
      }
    };
    canvas.addEventListener("pointerdown", handlePointerDown);

    let raf = 0;
    const loop = () => {
      renderer.render(getTimeRef.current());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      rendererObj.current = null;
      rendererRef?.(null);
    };
    // Renderer is rebuilt only when the song's structural props change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowMidi, highMidi, bpm]);

  useEffect(() => {
    rendererObj.current?.setNotes(notes);
  }, [notes]);

  useEffect(() => {
    if (verdicts) rendererObj.current?.setVerdicts(verdicts);
  }, [verdicts]);

  useEffect(() => {
    rendererObj.current?.setShowLabels(showKeyLabels);
  }, [showKeyLabels]);

  useEffect(() => {
    rendererObj.current?.setDebug(debug);
  }, [debug]);

  return (
    <div className="note-rain">
      <canvas ref={canvasRef} className="note-rain__canvas" />
    </div>
  );
}

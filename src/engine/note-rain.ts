import type { ScoreNote, NoteVerdict } from "./types";
import { buildKeyboard, type KeyboardRange, type KeyLayout } from "./keyboard";
import { isWhiteKey, midiToPitchClassName, beatsToMs } from "./music";

/**
 * A self-contained canvas renderer for the falling-notes ("note rain") view.
 *
 * It owns no timing loop and no React state. The host calls `render(nowMs)` on
 * every animation frame with the current playhead time; the renderer draws the
 * keyboard, the notes falling toward it, and any lit/judged keys. This keeps all
 * per-frame work off the React render path and makes the component a thin shell.
 */

export interface NoteRainOptions {
  lowMidi: number;
  highMidi: number;
  bpm: number;
  /** How many milliseconds a note is visible before it reaches the keyboard. */
  lookaheadMs?: number;
  showKeyLabels?: boolean;
}

interface Theme {
  bg: string;
  keyboardBg: string;
  whiteKey: string;
  blackKey: string;
  keyLine: string;
  label: string;
  rightHand: string;
  leftHand: string;
  hit: string;
  close: string;
  litGlow: string;
  hitLine: string;
}

const THEME: Theme = {
  bg: "#12162a",
  keyboardBg: "#0c0f1e",
  whiteKey: "#f6f8ff",
  blackKey: "#20263f",
  keyLine: "#2b3252",
  label: "#8a90b4",
  rightHand: "#5b8def",
  leftHand: "#ff9f45",
  hit: "#46c98b",
  close: "#ffcf5c",
  litGlow: "rgba(70,201,139,0.55)",
  hitLine: "#5b8def",
};

export class NoteRainRenderer {
  private ctx: CanvasRenderingContext2D;
  private kb: KeyboardRange;
  private opts: Required<NoteRainOptions>;
  private notes: ScoreNote[] = [];
  private verdicts = new Map<number, NoteVerdict>();
  /** midi -> ms timestamp until which the key should glow (from local input). */
  private litKeys = new Map<number, number>();
  private width = 0;
  private height = 0;
  private dpr = 1;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, options: NoteRainOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.opts = {
      lookaheadMs: 2200,
      showKeyLabels: true,
      ...options,
    };
    this.kb = buildKeyboard(options.lowMidi, options.highMidi);
    this.resize();
  }

  setNotes(notes: ScoreNote[]) {
    this.notes = notes;
  }

  setVerdicts(verdicts: Map<number, NoteVerdict>) {
    this.verdicts = verdicts;
  }

  /** Flash a key as pressed (from mic/MIDI/keyboard input) for ~180ms. */
  lightKey(midi: number, nowMs: number, holdMs = 180) {
    this.litKeys.set(midi, nowMs + holdMs);
  }

  setShowLabels(show: boolean) {
    this.opts.showKeyLabels = show;
  }

  /** Recompute backing-store size for the current CSS box and device DPR. */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private keyboardHeight(): number {
    // Keyboard occupies the bottom slab; keep it chunky for little fingers.
    return Math.min(160, Math.max(96, this.height * 0.26));
  }

  /** Draw one frame for the given playhead position in ms from song start. */
  render(nowMs: number) {
    const { ctx, width, height } = this;
    const kbH = this.keyboardHeight();
    const hitLineY = height - kbH;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = THEME.bg;
    ctx.fillRect(0, 0, width, height);

    this.drawFallingNotes(nowMs, hitLineY);
    this.drawHitLine(hitLineY);
    this.drawKeyboard(nowMs, hitLineY, kbH);
  }

  private drawFallingNotes(nowMs: number, hitLineY: number) {
    const { ctx, width } = this;
    const { lookaheadMs, bpm } = this.opts;
    const fallDist = hitLineY; // top of view (0) to hit line

    for (const note of this.notes) {
      const startMs = beatsToMs(note.startBeat, bpm);
      const durMs = beatsToMs(note.durBeats, bpm);
      const endMs = startMs + durMs;

      // Note is visible from lookahead before its start until it passes the line.
      if (startMs - nowMs > lookaheadMs) continue;
      if (endMs < nowMs - 250) continue;

      const key = this.kb.keys.find((k) => k.midi === note.midi);
      if (!key) continue;

      // Progress of the note head toward the hit line: 0 (top) -> 1 (line).
      const timeToHit = startMs - nowMs;
      const headProgress = 1 - timeToHit / lookaheadMs;
      const headY = headProgress * fallDist;
      const barLen = (durMs / lookaheadMs) * fallDist;

      const x = key.x * width;
      const w = key.w * width;
      const top = headY - barLen;

      const verdict = this.verdicts.get(note.id);
      ctx.fillStyle = this.noteColor(note.hand, verdict);
      this.roundRect(x + 1, top, Math.max(2, w - 2), Math.max(6, barLen), 5);
      ctx.fill();

      // A brighter cap on the leading edge helps kids read the strike moment.
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      this.roundRect(x + 1, headY - 4, Math.max(2, w - 2), 4, 2);
      ctx.fill();
    }
  }

  private noteColor(hand: "left" | "right", verdict?: NoteVerdict): string {
    if (verdict === "hit") return THEME.hit;
    if (verdict === "close") return THEME.close;
    return hand === "right" ? THEME.rightHand : THEME.leftHand;
  }

  private drawHitLine(y: number) {
    const { ctx, width } = this;
    ctx.strokeStyle = THEME.hitLine;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawKeyboard(nowMs: number, top: number, kbH: number) {
    const { ctx, width } = this;
    ctx.fillStyle = THEME.keyboardBg;
    ctx.fillRect(0, top, width, kbH);

    const whites = this.kb.keys.filter((k) => k.white);
    const blacks = this.kb.keys.filter((k) => !k.white);

    for (const k of whites) this.drawKey(k, nowMs, top, kbH, true);
    for (const k of blacks) this.drawKey(k, nowMs, top, kbH, false);
  }

  private drawKey(
    k: KeyLayout,
    nowMs: number,
    top: number,
    kbH: number,
    white: boolean,
  ) {
    const { ctx, width } = this;
    const x = k.x * width;
    const w = k.w * width;
    const h = white ? kbH : kbH * 0.62;
    const lit = (this.litKeys.get(k.midi) ?? 0) > nowMs;

    ctx.fillStyle = lit
      ? THEME.hit
      : white
        ? THEME.whiteKey
        : THEME.blackKey;
    ctx.strokeStyle = THEME.keyLine;
    ctx.lineWidth = 1;
    this.roundRect(x, top, w, h, white ? 4 : 3);
    ctx.fill();
    ctx.stroke();

    if (lit) {
      ctx.save();
      ctx.shadowColor = THEME.litGlow;
      ctx.shadowBlur = 18;
      this.roundRect(x, top, w, h, 4);
      ctx.fill();
      ctx.restore();
    }

    // Label C notes always; all white keys when labels are on.
    if (white && this.opts.showKeyLabels && isWhiteKey(k.midi)) {
      const name = midiToPitchClassName(k.midi);
      const isC = k.midi % 12 === 0;
      if (this.opts.showKeyLabels || isC) {
        ctx.fillStyle = lit ? "#0c0f1e" : THEME.label;
        ctx.font = `${Math.min(13, w * 0.5)}px "Baloo 2", system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(isC ? `${name}${Math.floor(k.midi / 12) - 1}` : name, x + w / 2, top + h - 8);
      }
    }
  }

  /**
   * Map a pointer position (CSS pixels relative to the canvas) to a piano key,
   * or null if the point isn't on the keyboard. Black keys win over white where
   * they overlap, matching a real keyboard's hit priority.
   */
  keyAt(px: number, py: number): number | null {
    const kbH = this.keyboardHeight();
    const top = this.height - kbH;
    if (py < top || py > this.height) return null;

    const xNorm = px / this.width;
    const blackH = kbH * 0.62;

    // Prefer black keys when the tap is in their (upper) region.
    if (py <= top + blackH) {
      for (const k of this.kb.keys) {
        if (k.white) continue;
        if (xNorm >= k.x && xNorm <= k.x + k.w) return k.midi;
      }
    }
    for (const k of this.kb.keys) {
      if (!k.white) continue;
      if (xNorm >= k.x && xNorm <= k.x + k.w) return k.midi;
    }
    return null;
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    const { ctx } = this;
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}

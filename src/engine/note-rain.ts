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
 *
 * Performance notes (this view must stay at 60fps on low-end Android tablets):
 *   - Per-note timings and each note's key geometry are precomputed once in
 *     `setNotes`, never per frame.
 *   - Only notes inside the visible lookahead window are touched each frame,
 *     found via an advancing cursor rather than scanning the whole song.
 *   - The idle keyboard is rendered once to an offscreen canvas and blitted;
 *     only lit keys are repainted per frame, and their glow is a pre-rendered
 *     sprite (canvas `shadowBlur` is pathologically slow on old Skia/Android).
 *   - The context is opaque + desynchronized, and the backing resolution adapts
 *     downward if frames run long, trading sharpness for smoothness.
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

/** A note with its per-frame-invariant geometry and timing precomputed. */
interface PreparedNote {
  note: ScoreNote;
  startMs: number;
  endMs: number;
  key: KeyLayout;
}

/** How long a note stays drawable after it passes the hit line (ms). */
const PASS_MS = 250;
/** Backing-resolution steps the adaptive scaler walks down under load. */
const QUALITY_STEPS = [1, 0.8, 0.66];

export class NoteRainRenderer {
  private ctx: CanvasRenderingContext2D;
  private kb: KeyboardRange;
  private keyByMidi = new Map<number, KeyLayout>();
  private opts: Required<NoteRainOptions>;
  /** Notes with precomputed ms/geometry, sorted by start time. */
  private prepared: PreparedNote[] = [];
  private verdicts = new Map<number, NoteVerdict>();
  /** midi -> wall-clock (performance.now) ms until which the key glows. */
  private litKeys = new Map<number, number>();
  /** Keys currently sounding at the playhead (auto-lit during playback). */
  private soundingKeys = new Set<number>();
  /** Advancing index of the first note that may still be visible. */
  private windowLo = 0;
  private lastNowMs = 0;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private maxDpr: number;
  private qualityIdx = 0;
  private canvas: HTMLCanvasElement;

  /** Offscreen cache of the idle keyboard; rebuilt only on resize/label change. */
  private kbCache: HTMLCanvasElement;
  private kbCacheKey = "";
  /** Pre-rendered radial glow, blitted behind lit keys instead of shadowBlur. */
  private glowSprite: HTMLCanvasElement;

  /** Rolling frame-interval stats for the optional debug overlay. */
  private debug = false;
  private frameSamples: number[] = [];
  private lastFrameStart = 0;
  private overlayText = "";
  private lastOverlayUpdate = 0;
  private lastAdaptCheck = 0;

  constructor(canvas: HTMLCanvasElement, options: NoteRainOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.opts = {
      lookaheadMs: 2200,
      showKeyLabels: true,
      ...options,
    };
    // Coarse pointers (touch tablets/phones) gain little from a 2x backing store
    // but pay full fill-rate for it, so cap them lower.
    const coarse =
      typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    this.maxDpr = coarse ? 1.5 : 2;
    this.kb = buildKeyboard(options.lowMidi, options.highMidi);
    for (const k of this.kb.keys) this.keyByMidi.set(k.midi, k);
    this.kbCache = document.createElement("canvas");
    this.glowSprite = buildGlowSprite();
    this.resize();
  }

  setNotes(notes: ScoreNote[]) {
    const { bpm } = this.opts;
    this.prepared = notes
      .map((note) => {
        const startMs = beatsToMs(note.startBeat, bpm);
        return {
          note,
          startMs,
          endMs: startMs + beatsToMs(note.durBeats, bpm),
          key: this.keyByMidi.get(note.midi)!,
        };
      })
      .filter((p) => p.key) // notes outside the keyboard range can't be drawn
      .sort((a, b) => a.startMs - b.startMs);
    this.windowLo = 0;
    this.lastNowMs = 0;
  }

  setVerdicts(verdicts: Map<number, NoteVerdict>) {
    this.verdicts = verdicts;
  }

  /**
   * Flash a key as pressed (from mic/MIDI/keyboard input). Uses wall-clock time
   * so the glow always fades regardless of whether the song playhead is running
   * — otherwise taps made before pressing play would stay lit forever.
   */
  lightKey(midi: number, holdMs = 200) {
    this.litKeys.set(midi, performance.now() + holdMs);
  }

  setShowLabels(show: boolean) {
    this.opts.showKeyLabels = show;
    this.kbCacheKey = ""; // force the keyboard cache to rebuild with/without text
  }

  /** Toggle the on-canvas frame-time overlay (measurement harness). */
  setDebug(on: boolean) {
    this.debug = on;
    this.overlayText = "";
  }

  /** Recompute backing-store size for the current CSS box and device DPR. */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const base = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.dpr = base * QUALITY_STEPS[this.qualityIdx];
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.kbCacheKey = ""; // geometry changed -> keyboard cache is stale
  }

  private keyboardHeight(): number {
    // Keyboard occupies the bottom slab; keep it chunky for little fingers.
    return Math.min(160, Math.max(96, this.height * 0.26));
  }

  /** Draw one frame for the given playhead position in ms from song start. */
  render(nowMs: number) {
    const frameStart = performance.now();
    const { ctx, width, height } = this;
    const kbH = this.keyboardHeight();
    const hitLineY = height - kbH;

    // Opaque canvas: the background fill covers the frame, so no clearRect.
    ctx.fillStyle = THEME.bg;
    ctx.fillRect(0, 0, width, height);

    this.drawVisibleNotes(nowMs, hitLineY);
    this.drawHitLine(hitLineY);
    this.drawKeyboard(hitLineY, kbH);

    this.recordFrame(frameStart);
  }

  /**
   * Advance the window cursor and draw every note within the lookahead window,
   * collecting the currently-sounding keys in the same pass (they're a subset of
   * the visible notes). Playhead time is monotonic while playing; on a seek back
   * we reset the cursor.
   */
  private drawVisibleNotes(nowMs: number, hitLineY: number) {
    const { ctx, width, prepared } = this;
    const { lookaheadMs } = this.opts;
    const fallDist = hitLineY; // top of view (0) to hit line

    this.soundingKeys.clear();

    if (nowMs < this.lastNowMs - 50) this.windowLo = 0; // seeked backward
    this.lastNowMs = nowMs;

    // Drop notes fully past the hit line from the front of the window.
    while (
      this.windowLo < prepared.length &&
      prepared[this.windowLo].endMs < nowMs - PASS_MS
    ) {
      this.windowLo++;
    }

    for (let i = this.windowLo; i < prepared.length; i++) {
      const p = prepared[i];
      // Notes are sorted by start; once one is still beyond the lookahead
      // horizon, every later note is too.
      if (p.startMs - nowMs > lookaheadMs) break;
      if (p.endMs < nowMs - PASS_MS) continue; // long-tail straggler, already gone

      if (nowMs >= p.startMs - 30 && nowMs <= p.endMs) {
        this.soundingKeys.add(p.note.midi);
      }

      const timeToHit = p.startMs - nowMs;
      const headProgress = 1 - timeToHit / lookaheadMs;
      const headY = headProgress * fallDist;
      const barLen = ((p.endMs - p.startMs) / lookaheadMs) * fallDist;

      const x = p.key.x * width;
      const w = p.key.w * width;
      const top = headY - barLen;

      ctx.fillStyle = this.noteColor(p.note.hand, this.verdicts.get(p.note.id));
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

  /** Blit the cached idle keyboard, then overpaint only the lit/sounding keys. */
  private drawKeyboard(top: number, kbH: number) {
    const { ctx, width } = this;
    this.ensureKeyboardCache(kbH);
    ctx.drawImage(this.kbCache, 0, top, width, kbH);

    const now = performance.now();
    for (const k of this.kb.keys) {
      const lit = (this.litKeys.get(k.midi) ?? 0) > now || this.soundingKeys.has(k.midi);
      if (lit) this.drawLitKey(ctx, k, top, kbH, k.white);
    }
  }

  /** Rebuild the offscreen keyboard image when the box/labels change. */
  private ensureKeyboardCache(kbH: number) {
    const cacheKey = `${Math.round(this.width)}x${Math.round(kbH)}@${this.dpr.toFixed(
      2,
    )}:${this.opts.showKeyLabels ? 1 : 0}`;
    if (cacheKey === this.kbCacheKey) return;
    this.kbCacheKey = cacheKey;

    const cache = this.kbCache;
    cache.width = Math.max(1, Math.round(this.width * this.dpr));
    cache.height = Math.max(1, Math.round(kbH * this.dpr));
    const cctx = cache.getContext("2d")!;
    cctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // The cache draws in its own space where the keyboard's top sits at y=0.
    cctx.fillStyle = THEME.keyboardBg;
    cctx.fillRect(0, 0, this.width, kbH);

    const whites = this.kb.keys.filter((k) => k.white);
    const blacks = this.kb.keys.filter((k) => !k.white);
    for (const k of whites) this.drawIdleKey(cctx, k, 0, kbH, true);
    for (const k of blacks) this.drawIdleKey(cctx, k, 0, kbH, false);
  }

  private drawIdleKey(
    ctx: CanvasRenderingContext2D,
    k: KeyLayout,
    top: number,
    kbH: number,
    white: boolean,
  ) {
    const x = k.x * this.width;
    const w = k.w * this.width;
    const h = white ? kbH : kbH * 0.62;

    ctx.fillStyle = white ? THEME.whiteKey : THEME.blackKey;
    ctx.strokeStyle = THEME.keyLine;
    ctx.lineWidth = 1;
    this.roundRectOn(ctx, x, top, w, h, white ? 4 : 3);
    ctx.fill();
    ctx.stroke();

    if (white && this.opts.showKeyLabels && isWhiteKey(k.midi)) {
      const name = midiToPitchClassName(k.midi);
      const isC = k.midi % 12 === 0;
      ctx.fillStyle = THEME.label;
      ctx.font = `${Math.min(13, w * 0.5)}px "Baloo 2", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(
        isC ? `${name}${Math.floor(k.midi / 12) - 1}` : name,
        x + w / 2,
        top + h - 8,
      );
    }
  }

  /** Overpaint a single key in its lit state, with a pre-rendered glow. */
  private drawLitKey(
    ctx: CanvasRenderingContext2D,
    k: KeyLayout,
    top: number,
    kbH: number,
    white: boolean,
  ) {
    const x = k.x * this.width;
    const w = k.w * this.width;
    const h = white ? kbH : kbH * 0.62;

    // Cheap glow: a cached radial sprite scaled over the key (no shadowBlur).
    const gw = w * 2.4;
    const gh = h * 1.3;
    ctx.drawImage(this.glowSprite, x + w / 2 - gw / 2, top + h / 2 - gh / 2, gw, gh);

    ctx.fillStyle = THEME.hit;
    ctx.strokeStyle = THEME.keyLine;
    ctx.lineWidth = 1;
    this.roundRectOn(ctx, x, top, w, h, white ? 4 : 3);
    ctx.fill();
    ctx.stroke();

    if (white && this.opts.showKeyLabels && isWhiteKey(k.midi)) {
      const name = midiToPitchClassName(k.midi);
      const isC = k.midi % 12 === 0;
      ctx.fillStyle = "#0c0f1e";
      ctx.font = `${Math.min(13, w * 0.5)}px "Baloo 2", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(
        isC ? `${name}${Math.floor(k.midi / 12) - 1}` : name,
        x + w / 2,
        top + h - 8,
      );
    }
  }

  /**
   * Sample frame intervals (always — the cost is one `performance.now` and an
   * array push), let the resolution adapt under sustained load, and draw the
   * text overlay only when debug is on.
   */
  private recordFrame(frameStart: number) {
    const now = performance.now();
    if (this.lastFrameStart > 0) {
      this.frameSamples.push(now - this.lastFrameStart);
      if (this.frameSamples.length > 180) this.frameSamples.shift();
    }
    this.lastFrameStart = now;

    this.maybeAdaptResolution(now);
    if (this.debug) this.drawOverlay(now, now - frameStart);
  }

  private drawOverlay(now: number, drawMs: number) {
    if (now - this.lastOverlayUpdate > 500 && this.frameSamples.length > 5) {
      this.lastOverlayUpdate = now;
      const sorted = [...this.frameSamples].sort((a, b) => a - b);
      const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const dropped = sorted.filter((v) => v > 20).length;
      this.overlayText =
        `${(1000 / avg).toFixed(0)}fps avg  p95 ${p95.toFixed(1)}ms  ` +
        `draw ${drawMs.toFixed(1)}ms  drop ${dropped}  q${this.dpr.toFixed(2)}`;
    }

    const { ctx } = this;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(6, 6, 260, 20);
    ctx.fillStyle = "#7CFFB2";
    ctx.font = '11px "Baloo 2", ui-monospace, monospace';
    ctx.textAlign = "left";
    ctx.fillText(this.overlayText, 12, 20);
  }

  /** Step the backing resolution down if frames are consistently slow. */
  private maybeAdaptResolution(now: number) {
    if (now - this.lastAdaptCheck < 2000 || this.frameSamples.length < 60) return;
    this.lastAdaptCheck = now;
    const sorted = [...this.frameSamples].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    if (p95 > 24 && this.qualityIdx < QUALITY_STEPS.length - 1) {
      this.qualityIdx++;
      this.resize();
      this.frameSamples = [];
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
    this.roundRectOn(this.ctx, x, y, w, h, r);
  }

  private roundRectOn(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
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

/** Build a small radial-gradient glow sprite once, reused for every lit key. */
function buildGlowSprite(): HTMLCanvasElement {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, THEME.litGlow);
  g.addColorStop(1, "rgba(70,201,139,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

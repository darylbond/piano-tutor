import { PitchDetector } from "pitchy";
import { BaseNoteInput } from "./input-source";
import { freqToMidi } from "@/engine/music";

/**
 * Microphone note input (PLAN §4.1).
 *
 * Monophonic real-time pitch detection: mic → AnalyserNode → pitchy (McLeod
 * Pitch Method) on each animation frame. Notes are emitted on *onset*, detected
 * by an RMS envelope gate with hysteresis, so a scored event corresponds to a
 * key being struck rather than to a sustained string — and repeated notes
 * (re-attacks) fire again after the level dips. Emits the shared `NoteEvent`, so
 * the scoring engine can't tell mic input from MIDI or the on-screen keyboard.
 *
 * For accuracy we deliberately disable the browser's voice-oriented DSP
 * (echo cancellation, noise suppression, auto gain) which mangles musical pitch.
 */

export interface MicConfig {
  /** Minimum MPM clarity (0–1) to trust a pitch. Piano tone is very clear. */
  clarityThreshold: number;
  /** RMS level that counts as the start of a note (rising edge). */
  attackThreshold: number;
  /** RMS must fall below this before another onset can fire (re-arm). */
  releaseThreshold: number;
  /** Ignore detections below this pitch (room rumble) and above (hiss). */
  minMidi: number;
  maxMidi: number;
  /** Global tuning offset in cents (acoustic pianos drift); from calibration. */
  tuningCents: number;
  /**
   * Minimum gap between onsets (ms). A held piano note's amplitude wobbles and
   * can dip below release then rise again; this refractory window stops one
   * keypress registering as several. Still short enough for fast repeats.
   */
  refractoryMs: number;
  /**
   * Minimum gap between pitch analyses (ms). The McLeod pitch method over 2048
   * samples is the heaviest thing on the main thread while playing along, and it
   * competes with the note-rain renderer for frame budget on low-end tablets.
   * Onsets only need ~30 Hz resolution — far finer than the refractory window —
   * so we gate the analysis instead of running it on every animation frame.
   */
  analysisIntervalMs: number;
}

export const DEFAULT_MIC_CONFIG: MicConfig = {
  clarityThreshold: 0.92,
  attackThreshold: 0.02,
  releaseThreshold: 0.012,
  minMidi: 36,
  maxMidi: 96,
  tuningCents: 0,
  refractoryMs: 140,
  analysisIntervalMs: 33,
};

export interface MicLevel {
  rms: number;
  clarity: number;
  midi: number | null;
  /** Cents deviation of the detected pitch from equal temperament (raw, for
   *  calibrating an acoustic piano's tuning). Null when no clear pitch. */
  cents: number | null;
}

export class MicNoteInput extends BaseNoteInput {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private detector: PitchDetector<Float32Array<ArrayBuffer>> | null = null;
  private buffer: Float32Array<ArrayBuffer> = new Float32Array(2048);
  private raf = 0;
  private armed = true;
  private lastOnsetMs = -Infinity;
  private lastAnalysisMs = 0;
  private running = false;
  private config: MicConfig;
  /** Optional live meter callback for the calibration/mic UI. */
  private onLevel: ((l: MicLevel) => void) | null = null;

  constructor(config: Partial<MicConfig> = {}) {
    super();
    this.config = { ...DEFAULT_MIC_CONFIG, ...config };
  }

  setConfig(patch: Partial<MicConfig>) {
    this.config = { ...this.config, ...patch };
  }

  onLevelUpdate(cb: ((l: MicLevel) => void) | null) {
    this.onLevel = cb;
  }

  isRunning() {
    return this.running;
  }

  /** Request the mic and start detecting. Throws if permission is denied. */
  async start(): Promise<void> {
    if (this.running) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    this.ctx = new AudioContext();
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.buffer = new Float32Array(this.analyser.fftSize);
    this.detector = PitchDetector.forFloat32Array(this.analyser.fftSize);
    source.connect(this.analyser);

    this.running = true;
    this.armed = true;
    this.loop();
  }

  private loop = () => {
    if (!this.running || !this.analyser || !this.ctx || !this.detector) return;

    // Throttle the expensive analysis: skip frames that arrive sooner than the
    // configured interval, but keep the rAF pump alive.
    const frameNow = performance.now();
    if (frameNow - this.lastAnalysisMs < this.config.analysisIntervalMs) {
      this.raf = requestAnimationFrame(this.loop);
      return;
    }
    this.lastAnalysisMs = frameNow;

    this.analyser.getFloatTimeDomainData(this.buffer);

    const rms = computeRms(this.buffer);
    const [freq, clarity] = this.detector.findPitch(this.buffer, this.ctx.sampleRate);

    let midi: number | null = null;
    let cents: number | null = null;
    if (clarity >= this.config.clarityThreshold && freq > 0) {
      const adjusted = freq * 2 ** (-this.config.tuningCents / 1200);
      const m = freqToMidi(adjusted).midi;
      if (m >= this.config.minMidi && m <= this.config.maxMidi) {
        midi = m;
        cents = freqToMidi(freq).cents; // raw deviation for calibration
      }
    }

    this.onLevel?.({ rms, clarity, midi, cents });

    // Onset detection with hysteresis + a refractory window: fire on the rising
    // edge, then require both a dip below release AND a minimum time gap before
    // the next onset, so a single sustained note fires exactly once.
    const now = performance.now();
    const pastRefractory = now - this.lastOnsetMs >= this.config.refractoryMs;
    if (this.armed && pastRefractory && rms >= this.config.attackThreshold && midi != null) {
      this.emit({
        midi,
        velocity: Math.min(1, rms * 8),
        timeMs: now,
        source: "mic",
      });
      this.armed = false;
      this.lastOnsetMs = now;
    } else if (rms < this.config.releaseThreshold) {
      this.armed = true;
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
    this.detector = null;
    this.stream = null;
  }

  override dispose() {
    this.stop();
    super.dispose();
  }
}

function computeRms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

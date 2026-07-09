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
}

export const DEFAULT_MIC_CONFIG: MicConfig = {
  clarityThreshold: 0.92,
  attackThreshold: 0.02,
  releaseThreshold: 0.012,
  minMidi: 36,
  maxMidi: 96,
  tuningCents: 0,
};

export interface MicLevel {
  rms: number;
  clarity: number;
  midi: number | null;
}

export class MicNoteInput extends BaseNoteInput {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private detector: PitchDetector<Float32Array<ArrayBuffer>> | null = null;
  private buffer: Float32Array<ArrayBuffer> = new Float32Array(2048);
  private raf = 0;
  private armed = true;
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
    this.analyser.getFloatTimeDomainData(this.buffer);

    const rms = computeRms(this.buffer);
    const [freq, clarity] = this.detector.findPitch(this.buffer, this.ctx.sampleRate);

    let midi: number | null = null;
    if (clarity >= this.config.clarityThreshold && freq > 0) {
      const adjusted = freq * 2 ** (-this.config.tuningCents / 1200);
      const m = freqToMidi(adjusted).midi;
      if (m >= this.config.minMidi && m <= this.config.maxMidi) midi = m;
    }

    this.onLevel?.({ rms, clarity, midi });

    // Onset detection with hysteresis: fire on the rising edge, then wait for a
    // dip below release before the next onset can fire.
    if (this.armed && rms >= this.config.attackThreshold && midi != null) {
      this.emit({
        midi,
        velocity: Math.min(1, rms * 8),
        timeMs: performance.now(),
        source: "mic",
      });
      this.armed = false;
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

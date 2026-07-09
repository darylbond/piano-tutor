import type { ScoreNote } from "./types";
import { midiToFreq, beatsToMs } from "./music";

/**
 * A tiny built-in piano-ish synth for "Listen" mode and note feedback.
 *
 * This is deliberately minimal (a two-oscillator voice with an ADSR gain
 * envelope) so v1 makes sound with zero downloads. PLAN §5.1 swaps this for
 * sampled playback via `smplr` later; the play/stop interface stays the same.
 */
export class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private scheduled: AudioScheduledSourceNode[] = [];
  private volume = 0.8;

  /** Must be called from a user gesture (tap) to satisfy autoplay policies. */
  ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  /** Current audio-clock time in seconds (0 before the context exists). */
  now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /** Play a single note now (for live key feedback / echo exercises). */
  playNote(midi: number, durationMs = 400) {
    const ctx = this.ensureContext();
    this.voice(midi, ctx.currentTime, durationMs / 1000);
  }

  /**
   * Schedule an entire song starting `offsetMs` into the piece.
   * Returns the AudioContext time (seconds) at which the playhead's "0" sits,
   * so the visual clock can be aligned to the audio clock.
   */
  playSong(notes: ScoreNote[], bpm: number, offsetMs = 0, rate = 1): number {
    const ctx = this.ensureContext();
    this.stop();
    const t0 = ctx.currentTime + 0.08; // small lead-in to avoid a clipped first note
    const zeroTime = t0 - offsetMs / 1000 / rate;

    for (const note of notes) {
      const startMs = beatsToMs(note.startBeat, bpm) / rate;
      const durMs = beatsToMs(note.durBeats, bpm) / rate;
      if (startMs < offsetMs) continue;
      const when = zeroTime + startMs / 1000;
      this.voice(note.midi, when, Math.max(0.12, durMs / 1000) * 0.95);
    }
    return zeroTime;
  }

  private voice(midi: number, when: number, durSec: number) {
    const ctx = this.ctx!;
    const freq = midiToFreq(midi);

    const gain = ctx.createGain();
    gain.connect(this.master!);

    // ADSR — quick attack, gentle decay; keeps it soft and non-harsh for kids.
    const peak = 0.28;
    const a = 0.008;
    const d = 0.12;
    const s = 0.16;
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(peak, when + a);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, s), when + a + d);
    gain.gain.setValueAtTime(Math.max(0.0001, s), when + durSec);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + durSec + 0.18);

    const osc1 = ctx.createOscillator();
    osc1.type = "triangle";
    osc1.frequency.value = freq;

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = freq * 2; // octave shimmer for a brighter, bell-like tone
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    osc2.connect(g2).connect(gain);
    osc1.connect(gain);

    const stopAt = when + durSec + 0.2;
    osc1.start(when);
    osc2.start(when);
    osc1.stop(stopAt);
    osc2.stop(stopAt);

    this.scheduled.push(osc1, osc2);
    const cleanup = () => {
      this.scheduled = this.scheduled.filter((n) => n !== osc1 && n !== osc2);
    };
    osc1.onended = cleanup;
  }

  /** Stop all scheduled/ringing notes immediately. */
  stop() {
    for (const node of this.scheduled) {
      try {
        node.stop();
      } catch {
        // already stopped
      }
    }
    this.scheduled = [];
  }
}

/**
 * A simple, pausable transport clock measured in milliseconds.
 *
 * Play-along timing is driven off `performance.now()` rather than frame counts,
 * so playback speed is independent of frame rate. Later milestones swap this for
 * the Web Audio clock when real sound scheduling lands; the interface stays the
 * same so the renderers and scorer don't care.
 */
export class TransportClock {
  private startedAt = 0;
  private pausedElapsed = 0;
  private running = false;
  private rate = 1;

  /** Current position in ms from the start of the piece. */
  now(): number {
    if (!this.running) return this.pausedElapsed;
    return this.pausedElapsed + (performance.now() - this.startedAt) * this.rate;
  }

  isRunning(): boolean {
    return this.running;
  }

  start() {
    if (this.running) return;
    this.startedAt = performance.now();
    this.running = true;
  }

  pause() {
    if (!this.running) return;
    this.pausedElapsed = this.now();
    this.running = false;
  }

  toggle() {
    this.running ? this.pause() : this.start();
  }

  /** Jump to a specific position in ms. */
  seek(ms: number) {
    this.pausedElapsed = Math.max(0, ms);
    this.startedAt = performance.now();
  }

  reset() {
    this.pausedElapsed = 0;
    this.startedAt = performance.now();
    this.running = false;
  }

  /** Playback rate multiplier (1 = authored tempo). */
  setRate(rate: number) {
    // Re-anchor so the change doesn't jump the current position.
    this.pausedElapsed = this.now();
    this.startedAt = performance.now();
    this.rate = rate;
  }

  getRate(): number {
    return this.rate;
  }
}

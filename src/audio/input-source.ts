import type { NoteEvent } from "@/engine/types";

/**
 * A NoteInput is any source of played notes: the on-screen keyboard now, and
 * the microphone / Web MIDI in later milestones. Consumers (the wait-mode
 * session, exercises) subscribe to a single stream and never learn which
 * hardware produced an event — that's the whole point of the `NoteEvent`
 * contract in engine/types.ts.
 */
export interface NoteInput {
  /** Subscribe to note-onset events. Returns an unsubscribe function. */
  subscribe(listener: (e: NoteEvent) => void): () => void;
  /** Release any resources (mic streams, MIDI handlers). */
  dispose(): void;
}

/** Base class handling listener bookkeeping so sources only emit. */
export class BaseNoteInput implements NoteInput {
  private listeners = new Set<(e: NoteEvent) => void>();

  subscribe(listener: (e: NoteEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  protected emit(event: NoteEvent) {
    for (const l of this.listeners) l(event);
  }

  dispose() {
    this.listeners.clear();
  }
}

/**
 * A manual input source driven by the on-screen keyboard (or, in tests, direct
 * calls). Also the fallback "click to play" mode for kids without a mic yet.
 */
export class ManualNoteInput extends BaseNoteInput {
  press(midi: number, velocity = 0.8) {
    this.emit({ midi, velocity, timeMs: performance.now(), source: "keyboard" });
  }
}

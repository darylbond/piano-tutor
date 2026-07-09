import { BaseNoteInput } from "./input-source";

/**
 * Web MIDI input (PLAN §4.3).
 *
 * If the student's piano has USB/MIDI, this gives perfect note + velocity +
 * timing with none of the mic's ambiguity. It emits the same `NoteEvent` as the
 * mic and on-screen keyboard, so the scoring engine is unchanged. Digital-piano
 * users effectively get an "easy mode" for free.
 *
 * Detection is automatic: `listen()` resolves with whether any MIDI input exists,
 * and new devices that appear later are picked up via statechange.
 */
export class MidiNoteInput extends BaseNoteInput {
  private access: MIDIAccess | null = null;
  private attached = new Set<MIDIInput>();
  private onAvailabilityChange: ((available: boolean) => void) | null = null;

  static isSupported(): boolean {
    return typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
  }

  onAvailability(cb: (available: boolean) => void) {
    this.onAvailabilityChange = cb;
  }

  /** Request MIDI access and attach to all inputs. Returns true if any exist. */
  async listen(): Promise<boolean> {
    if (!MidiNoteInput.isSupported()) return false;
    this.access = await navigator.requestMIDIAccess({ sysex: false });
    this.attachAll();
    this.access.onstatechange = () => {
      this.attachAll();
      this.onAvailabilityChange?.(this.attached.size > 0);
    };
    return this.attached.size > 0;
  }

  private attachAll() {
    if (!this.access) return;
    for (const input of this.access.inputs.values()) {
      if (this.attached.has(input)) continue;
      input.onmidimessage = (e) => this.handleMessage(e);
      this.attached.add(input);
    }
  }

  private handleMessage(e: MIDIMessageEvent) {
    const data = e.data;
    if (!data || data.length < 3) return;
    const [status, note, velocity] = data;
    const command = status & 0xf0;
    // Note On with non-zero velocity is a key press; Note Off (or vel 0) ignored.
    if (command === 0x90 && velocity > 0) {
      this.emit({
        midi: note,
        velocity: velocity / 127,
        timeMs: performance.now(),
        source: "midi",
      });
    }
  }

  /** Names of connected inputs, for a friendly "Connected: <piano>" label. */
  deviceNames(): string[] {
    return [...this.attached].map((i) => i.name ?? "MIDI device");
  }

  override dispose() {
    for (const input of this.attached) input.onmidimessage = null;
    this.attached.clear();
    if (this.access) this.access.onstatechange = null;
    this.access = null;
    super.dispose();
  }
}

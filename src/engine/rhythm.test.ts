import { describe, it, expect } from "vitest";
import { RhythmMatcher } from "./rhythm";
import type { ScoreNote, NoteEvent } from "./types";

// 120bpm => 1 beat = 500ms. Notes at beats 0,1,2 => 0ms,500ms,1000ms.
function notes(): ScoreNote[] {
  return [
    { id: 0, midi: 60, startBeat: 0, durBeats: 1, hand: "right", measure: 1 },
    { id: 1, midi: 62, startBeat: 1, durBeats: 1, hand: "right", measure: 1 },
    { id: 2, midi: 64, startBeat: 2, durBeats: 1, hand: "right", measure: 1 },
  ];
}
const heard = (midi: number): NoteEvent => ({ midi, timeMs: 0, source: "keyboard" });

describe("RhythmMatcher", () => {
  it("scores an on-time note as a hit", () => {
    const m = new RhythmMatcher(notes(), 120);
    expect(m.handleEvent(heard(60), 20)).toBe("hit");
  });

  it("scores a slightly-late note as close", () => {
    const m = new RhythmMatcher(notes(), 120);
    // 200ms late: beyond perfect (130) but within good (280).
    expect(m.handleEvent(heard(62), 500 + 200)).toBe("close");
  });

  it("rejects a note far outside any window", () => {
    const m = new RhythmMatcher(notes(), 120);
    expect(m.handleEvent(heard(60), 5000)).toBeNull();
  });

  it("rejects a wrong pitch", () => {
    const m = new RhythmMatcher(notes(), 120);
    expect(m.handleEvent(heard(61), 20)).toBeNull();
  });

  it("marks unplayed notes as missed once their window passes", () => {
    const m = new RhythmMatcher(notes(), 120);
    m.update(2000); // well past all target+good
    const v = m.getVerdicts();
    expect(v.get(0)).toBe("missed");
    expect(v.get(1)).toBe("missed");
    expect(v.get(2)).toBe("missed");
    expect(m.isComplete()).toBe(true);
  });

  it("matches the nearest expected note in time", () => {
    const m = new RhythmMatcher(notes(), 120);
    // Play E near beat 2 (1000ms); should claim note id 2, not 0.
    expect(m.handleEvent(heard(64), 1010)).toBe("hit");
    const v = m.getVerdicts();
    expect(v.get(2)).toBe("hit");
    expect(v.get(0)).toBe("pending");
  });

  it("is octave forgiving by default", () => {
    const m = new RhythmMatcher(notes(), 120);
    expect(m.handleEvent(heard(72), 20)).toBe("hit"); // C5 for expected C4
  });
});

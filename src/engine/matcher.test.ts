import { describe, it, expect } from "vitest";
import { WaitModeMatcher, groupIntoSteps, noteMatches } from "./matcher";
import type { ScoreNote, NoteEvent } from "./types";

function n(id: number, midi: number, startBeat: number): ScoreNote {
  return { id, midi, startBeat, durBeats: 1, hand: "right", measure: 1 };
}
function heard(midi: number): NoteEvent {
  return { midi, timeMs: 0, source: "keyboard" };
}

describe("noteMatches", () => {
  const note = n(0, 60, 0); // middle C
  it("matches exact pitch", () => {
    expect(noteMatches(note, heard(60))).toBe(true);
  });
  it("matches other octave when forgiving", () => {
    expect(noteMatches(note, heard(72), { octaveForgiving: true })).toBe(true);
  });
  it("rejects other octave when strict", () => {
    expect(noteMatches(note, heard(72), { octaveForgiving: false })).toBe(false);
  });
  it("rejects a wrong note", () => {
    expect(noteMatches(note, heard(61))).toBe(false);
  });
});

describe("groupIntoSteps", () => {
  it("groups notes sharing a start beat into one step", () => {
    const steps = groupIntoSteps([n(0, 60, 0), n(1, 64, 0), n(2, 67, 1)]);
    expect(steps.length).toBe(2);
    expect(steps[0].map((s) => s.midi)).toEqual([60, 64]);
    expect(steps[1].map((s) => s.midi)).toEqual([67]);
  });
});

describe("WaitModeMatcher", () => {
  it("advances one melody note at a time", () => {
    const notes = [n(0, 60, 0), n(1, 62, 1), n(2, 64, 2)];
    const m = new WaitModeMatcher(notes);

    expect(m.cursorBeat()).toBe(0);
    expect(m.handleEvent(heard(61))).toBe(false); // wrong note, no advance
    expect(m.cursorBeat()).toBe(0);

    expect(m.handleEvent(heard(60))).toBe(true); // correct -> advance
    expect(m.cursorBeat()).toBe(1);
    expect(m.getVerdicts().get(0)).toBe("hit");

    expect(m.handleEvent(heard(62))).toBe(true);
    expect(m.handleEvent(heard(64))).toBe(true);
    expect(m.isComplete()).toBe(true);
  });

  it("requires every note of a chord before advancing", () => {
    const notes = [n(0, 60, 0), n(1, 64, 0), n(2, 67, 0), n(3, 72, 1)];
    const m = new WaitModeMatcher(notes);

    expect(m.handleEvent(heard(60))).toBe(false);
    expect(m.handleEvent(heard(64))).toBe(false);
    expect(m.handleEvent(heard(67))).toBe(true); // chord complete -> advance
    expect(m.cursorBeat()).toBe(1);
  });

  it("ignores extra/duplicate notes without breaking", () => {
    const notes = [n(0, 60, 0), n(1, 62, 1)];
    const m = new WaitModeMatcher(notes);
    m.handleEvent(heard(60));
    expect(m.handleEvent(heard(60))).toBe(false); // duplicate, already advanced
    expect(m.cursorBeat()).toBe(1);
  });

  it("resets cleanly", () => {
    const notes = [n(0, 60, 0), n(1, 62, 1)];
    const m = new WaitModeMatcher(notes);
    m.handleEvent(heard(60));
    m.reset();
    expect(m.cursorBeat()).toBe(0);
    expect(m.getVerdicts().get(0)).toBe("pending");
  });
});

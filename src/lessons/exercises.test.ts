import { describe, it, expect } from "vitest";
import { listExercises, getExercise, isExerciseId } from "./exercises";

describe("exercises", () => {
  it("lists exercises with unique exercise-prefixed ids", () => {
    const list = listExercises();
    expect(list.length).toBeGreaterThan(0);
    const ids = new Set(list.map((e) => e.id));
    expect(ids.size).toBe(list.length);
    for (const e of list) expect(isExerciseId(e.id)).toBe(true);
  });

  it("builds a valid Song for every listed exercise", () => {
    for (const meta of listExercises()) {
      const song = getExercise(meta.id);
      expect(song).not.toBeNull();
      expect(song!.notes.length).toBeGreaterThan(0);
      // Notes are strictly ordered in time with unique ids.
      const ids = new Set(song!.notes.map((n) => n.id));
      expect(ids.size).toBe(song!.notes.length);
      for (let i = 1; i < song!.notes.length; i++) {
        expect(song!.notes[i].startBeat).toBeGreaterThan(song!.notes[i - 1].startBeat);
      }
      // All notes are in a sane piano range.
      for (const n of song!.notes) {
        expect(n.midi).toBeGreaterThanOrEqual(21);
        expect(n.midi).toBeLessThanOrEqual(108);
      }
    }
  });

  it("C major scale goes up an octave and back", () => {
    const song = getExercise("exercise-c-major-scale")!;
    const midis = song.notes.map((n) => n.midi);
    expect(midis[0]).toBe(60); // C4
    expect(Math.max(...midis)).toBe(72); // C5 at the top
    expect(midis[midis.length - 1]).toBe(60); // back to C4
  });

  it("returns null for an unknown exercise id", () => {
    expect(getExercise("exercise-nope")).toBeNull();
  });
});

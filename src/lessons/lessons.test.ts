import { describe, it, expect } from "vitest";
import { LESSONS, getLesson } from "./lessons";

describe("lessons", () => {
  it("has unique ids and at least one step each", () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of LESSONS) expect(l.steps.length).toBeGreaterThan(0);
  });

  it("keeps every interactive note within the lesson's keyboard range", () => {
    for (const l of LESSONS) {
      for (const step of l.steps) {
        const midis =
          step.kind === "find" ? [step.midi]
          : step.kind === "play" || step.kind === "chord" ? step.midis
          : [];
        for (const m of midis) {
          expect(m, `${l.id} note ${m} out of range`).toBeGreaterThanOrEqual(l.lowMidi);
          expect(m, `${l.id} note ${m} out of range`).toBeLessThanOrEqual(l.highMidi);
        }
      }
    }
  });

  it("chord steps play two or more distinct notes", () => {
    for (const l of LESSONS) {
      for (const step of l.steps) {
        if (step.kind === "chord") {
          expect(new Set(step.midis).size).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("looks up a lesson by id", () => {
    expect(getLesson("meet-the-piano")?.title).toBe("Meet the Piano");
    expect(getLesson("nope")).toBeUndefined();
  });
});

import { describe, it, expect } from "vitest";
import { staffStep, needsSharp, ledgerLines, diatonicIndex } from "./staff";

describe("diatonicIndex", () => {
  it("increments by 7 per octave", () => {
    expect(diatonicIndex(72) - diatonicIndex(60)).toBe(7); // C5 - C4
  });
  it("treats C# as the same diatonic step as C", () => {
    expect(diatonicIndex(61)).toBe(diatonicIndex(60));
  });
});

describe("staffStep (treble, bottom line = E4)", () => {
  it("puts E4 on the bottom line", () => {
    expect(staffStep(64)).toBe(0);
  });
  it("puts F4 in the first space", () => {
    expect(staffStep(65)).toBe(1);
  });
  it("puts G4 on the second line", () => {
    expect(staffStep(67)).toBe(2);
  });
  it("puts F5 on the top line", () => {
    expect(staffStep(77)).toBe(8);
  });
  it("puts middle C below the staff", () => {
    expect(staffStep(60)).toBe(-2);
  });
  it("orders pitches monotonically", () => {
    expect(staffStep(60)).toBeLessThan(staffStep(62));
    expect(staffStep(72)).toBeGreaterThan(staffStep(71));
  });
});

describe("needsSharp", () => {
  it("flags black keys", () => {
    expect(needsSharp(61)).toBe(true); // C#
    expect(needsSharp(66)).toBe(true); // F#
  });
  it("does not flag white keys", () => {
    expect(needsSharp(60)).toBe(false);
    expect(needsSharp(64)).toBe(false);
  });
});

describe("ledgerLines", () => {
  it("gives one ledger line for middle C", () => {
    expect(ledgerLines(-2)).toEqual([-2]);
  });
  it("gives none for notes on the staff", () => {
    expect(ledgerLines(4)).toEqual([]);
  });
  it("gives ledger lines above for high notes", () => {
    expect(ledgerLines(10)).toEqual([10]);
  });
});

import { describe, it, expect } from "vitest";
import { buildKeyboard, keyCenter } from "./keyboard";

describe("buildKeyboard", () => {
  it("spans exactly one octave C4–C5 with 8 white keys", () => {
    const kb = buildKeyboard(60, 72);
    expect(kb.whiteCount).toBe(8); // C D E F G A B C
  });

  it("snaps a black-key low bound down to a white key", () => {
    const kb = buildKeyboard(61, 72); // C#4 -> should snap to C4
    expect(kb.lowMidi).toBe(60);
  });

  it("includes both white and black keys", () => {
    const kb = buildKeyboard(60, 72);
    const whites = kb.keys.filter((k) => k.white).length;
    const blacks = kb.keys.filter((k) => !k.white).length;
    expect(whites).toBe(8);
    expect(blacks).toBe(5); // C# D# F# G# A#
  });

  it("orders white-key centers left to right", () => {
    const kb = buildKeyboard(60, 72);
    const c4 = keyCenter(kb, 60)!;
    const c5 = keyCenter(kb, 72)!;
    expect(c4).toBeLessThan(c5);
    expect(c4).toBeGreaterThanOrEqual(0);
    expect(c5).toBeLessThanOrEqual(1);
  });

  it("returns null for a note outside the range", () => {
    const kb = buildKeyboard(60, 72);
    expect(keyCenter(kb, 40)).toBeNull();
  });
});

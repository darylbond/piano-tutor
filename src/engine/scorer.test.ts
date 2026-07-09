import { describe, it, expect } from "vitest";
import { scorePlaythrough, starsForAccuracy } from "./scorer";
import type { ScoredNote } from "./scorer";

const hit = (measure = 1): ScoredNote => ({ verdict: "hit", measure });
const miss = (measure = 1): ScoredNote => ({ verdict: "missed", measure });
const close = (measure = 1): ScoredNote => ({ verdict: "close", measure });

describe("starsForAccuracy", () => {
  it("awards 3 stars for near-perfect", () => {
    expect(starsForAccuracy(1)).toBe(3);
    expect(starsForAccuracy(0.95)).toBe(3);
  });
  it("awards 2 stars for good", () => {
    expect(starsForAccuracy(0.85)).toBe(2);
  });
  it("awards 1 star for finishing with some hits", () => {
    expect(starsForAccuracy(0.3)).toBe(1);
  });
  it("awards 0 stars for nothing", () => {
    expect(starsForAccuracy(0)).toBe(0);
  });
});

describe("scorePlaythrough", () => {
  it("computes a perfect run", () => {
    const r = scorePlaythrough([hit(1), hit(1), hit(2)]);
    expect(r.accuracy).toBe(1);
    expect(r.stars).toBe(3);
    expect(r.trickyMeasures).toEqual([]);
  });

  it("gives half credit for close notes and flags their measures", () => {
    const r = scorePlaythrough([hit(1), close(2), miss(3)]);
    expect(r.hits).toBe(1);
    expect(r.close).toBe(1);
    expect(r.missed).toBe(1);
    expect(r.accuracy).toBeCloseTo((1 + 0.5) / 3);
    expect(r.trickyMeasures).toEqual([2, 3]);
  });

  it("handles an empty run", () => {
    const r = scorePlaythrough([]);
    expect(r.accuracy).toBe(0);
    expect(r.stars).toBe(0);
  });
});

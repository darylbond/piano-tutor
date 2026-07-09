import { describe, it, expect } from "vitest";
import {
  midiToName,
  midiToPitchClassName,
  isWhiteKey,
  samePitchClass,
  beatsToMs,
  msToBeats,
  midiToFreq,
  freqToMidi,
} from "./music";

describe("midiToName", () => {
  it("names middle C", () => {
    expect(midiToName(60)).toBe("C4");
  });
  it("names A4 = 440 reference", () => {
    expect(midiToName(69)).toBe("A4");
  });
  it("names sharps", () => {
    expect(midiToName(61)).toBe("C#4");
  });
});

describe("isWhiteKey", () => {
  it("C is white", () => expect(isWhiteKey(60)).toBe(true));
  it("C# is black", () => expect(isWhiteKey(61)).toBe(false));
});

describe("samePitchClass", () => {
  it("matches across octaves", () => {
    expect(samePitchClass(60, 72)).toBe(true);
  });
  it("rejects different classes", () => {
    expect(samePitchClass(60, 61)).toBe(false);
  });
});

describe("tempo conversions", () => {
  it("1 beat at 120bpm is 500ms", () => {
    expect(beatsToMs(1, 120)).toBe(500);
  });
  it("round-trips", () => {
    expect(msToBeats(beatsToMs(3, 90), 90)).toBeCloseTo(3);
  });
});

describe("frequency", () => {
  it("A4 is 440Hz", () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
  });
  it("detects A4 from 440Hz with ~0 cents", () => {
    const { midi, cents } = freqToMidi(440);
    expect(midi).toBe(69);
    expect(Math.abs(cents)).toBeLessThan(1);
  });
  it("reports sharp tuning as positive cents", () => {
    const { midi, cents } = freqToMidi(444);
    expect(midi).toBe(69);
    expect(cents).toBeGreaterThan(0);
  });
});

describe("midiToPitchClassName", () => {
  it("drops the octave", () => {
    expect(midiToPitchClassName(72)).toBe("C");
  });
});

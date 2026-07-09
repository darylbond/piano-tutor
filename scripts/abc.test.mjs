import { describe, it, expect } from "vitest";
import { parseAbc } from "./abc.mjs";

const midis = (abc) => parseAbc(abc).notes.map((n) => n.midi);

describe("parseAbc", () => {
  it("maps octave marks (upper=4, lower=5, ',' and ' down/up)", () => {
    // C, = C3, C = C4, c = C5, c' = C6
    expect(midis("K:C\nC, C c c'")).toEqual([48, 60, 72, 84]);
  });

  it("applies the key signature (G major sharpens F)", () => {
    // In G major, bare F is F# (66), not F natural (65).
    expect(parseAbc("K:G\nF").notes[0].midi).toBe(66);
    // A natural sign overrides the key within the bar.
    expect(parseAbc("K:G\n=F").notes[0].midi).toBe(65);
  });

  it("supports modal keys (A dorian = D major scale on A: only F#)", () => {
    // A dorian: A B C D E F# G. Lowercase = octave 5, so c is C natural (72,
    // would be 73 if wrongly sharped) and f is F# (78).
    expect(parseAbc("K:Ador\nc").notes[0].midi).toBe(72);
    expect(parseAbc("K:Ador\nf").notes[0].midi).toBe(78);
  });

  it("reads note lengths and broken rhythm", () => {
    const { notes } = parseAbc("L:1/4\nK:C\nC2 C/2 C>C");
    expect(notes.map((n) => n.durBeats)).toEqual([2, 0.5, 1.5, 0.5]);
  });

  it("keeps only the melody (first) voice in multi-voice tunes", () => {
    const abc = [
      "M:4/4",
      "L:1/4",
      "K:C",
      "V:1",
      "C D E F",
      "V:2",
      "C, C, C, C,", // bass — must be dropped
      "V:1",
      "G A B c",
    ].join("\n");
    expect(midis(abc)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
  });

  it("plays the top note of a chord (skyline melody)", () => {
    // [CEG] -> keep G (67); the length after the bracket applies.
    const { notes } = parseAbc("L:1/4\nK:C\n[CEG]2 [DFA]");
    expect(notes.map((n) => n.midi)).toEqual([67, 69]);
    expect(notes[0].durBeats).toBe(2);
  });

  it("extracts metadata from headers and %% directives", () => {
    const abc = [
      "%%id my-tune",
      "%%level 4",
      "%%blurb Hello there.",
      "X:1",
      "T:My Tune",
      "C:A. Composer",
      "K:C",
      "C",
    ].join("\n");
    const p = parseAbc(abc);
    expect(p.title).toBe("My Tune");
    expect(p.composer).toBe("A. Composer");
    expect(p.directives).toMatchObject({ id: "my-tune", level: "4", blurb: "Hello there." });
  });

  it("parses the Minuet in G opening (multi-voice source)", () => {
    const abc = [
      "L:1/4",
      "M:3/4",
      "K:G",
      "V:1 treble",
      "V:2 bass",
      "V:1",
      '"G"d G/A/"D7"B/c/ | "G"d .G .G |',
      "V:2",
      "G,3 | B,3 |",
    ].join("\n");
    // D5 G4 A4 B4 C5 | D5 G4 G4
    expect(midis(abc)).toEqual([74, 67, 69, 71, 72, 74, 67, 67]);
  });
});

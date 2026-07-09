import { describe, it, expect } from "vitest";
import { Midi } from "@tonejs/midi";
import { parseMidiToSong, slug } from "./midi-import";

function buildMidi(build: (m: Midi) => void): Uint8Array {
  const midi = new Midi();
  build(midi);
  return midi.toArray();
}

describe("parseMidiToSong", () => {
  it("converts a simple melody to beats", () => {
    // Default 120bpm: 0.5s = 1 beat.
    const data = buildMidi((m) => {
      const t = m.addTrack();
      t.addNote({ midi: 60, time: 0, duration: 0.5 });
      t.addNote({ midi: 62, time: 0.5, duration: 0.5 });
      t.addNote({ midi: 64, time: 1.0, duration: 0.5 });
    });
    const { song } = parseMidiToSong(data, "Test Tune");
    expect(song.notes.map((n) => n.midi)).toEqual([60, 62, 64]);
    expect(song.notes.map((n) => n.startBeat)).toEqual([0, 1, 2]);
    expect(song.title).toBe("Test Tune");
    expect(song.id).toBe("user-test-tune");
  });

  it("dechords with a skyline pass (keeps the highest note per onset)", () => {
    const data = buildMidi((m) => {
      const t = m.addTrack();
      t.addNote({ midi: 60, time: 0, duration: 1 });
      t.addNote({ midi: 64, time: 0, duration: 1 }); // same onset, higher
      t.addNote({ midi: 67, time: 0, duration: 1 }); // same onset, highest
      t.addNote({ midi: 72, time: 1, duration: 1 });
    });
    const { song } = parseMidiToSong(data, "Chord Test");
    expect(song.notes.map((n) => n.midi)).toEqual([67, 72]);
  });

  it("prefers the higher-pitched track as the melody", () => {
    const data = buildMidi((m) => {
      const bass = m.addTrack();
      const mel = m.addTrack();
      for (let i = 0; i < 10; i++) {
        bass.addNote({ midi: 40 + (i % 3), time: i * 0.5, duration: 0.5 });
        mel.addNote({ midi: 72 + (i % 4), time: i * 0.5, duration: 0.5 });
      }
    });
    const { song } = parseMidiToSong(data, "Two Hands");
    // Should have chosen the melody (high) track: all notes >= 60.
    expect(song.notes.every((n) => n.midi >= 60)).toBe(true);
  });
});

describe("slug", () => {
  it("makes a safe id", () => {
    expect(slug("Für Elise!")).toBe("f-r-elise");
    expect(slug("  Hello World  ")).toBe("hello-world");
  });
});

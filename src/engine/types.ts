/**
 * The shared contract between everything that produces or consumes music events.
 *
 * Every input source — microphone pitch detection, Web MIDI, or an on-screen
 * debug keyboard — emits `NoteEvent`s. Every renderer (Note Rain, Sheet View)
 * draws from `ScoreNote`s. The scoring engine matches one against the other and
 * knows nothing about audio hardware or pixels, which keeps it fully unit-testable.
 */

/** A note the student is expected to play, as authored in a song's notes.json. */
export interface ScoreNote {
  /** Unique within a song; stable across reloads (used as a render/match key). */
  id: number;
  /** MIDI note number, 21–108 (A0–C8). Middle C = 60. */
  midi: number;
  /** When the note begins, in beats from the start of the piece. */
  startBeat: number;
  /** Duration in beats. */
  durBeats: number;
  /** Which hand plays it — drives note-rain color and hand filtering. */
  hand: "left" | "right";
  /** 1-based measure number, for "practice these bars" looping. */
  measure: number;
}

/** A note actually heard/played, from any input source. */
export interface NoteEvent {
  /** MIDI note number of the detected pitch. */
  midi: number;
  /** 0–1 loudness if the source provides it (MIDI velocity, mic energy). */
  velocity?: number;
  /** Performance-clock time of the onset, in milliseconds. */
  timeMs: number;
  /** Where it came from — useful for debugging and scoring tolerances. */
  source: "mic" | "midi" | "keyboard";
}

/** How a single expected note was judged after a play-through. */
export type NoteVerdict = "hit" | "close" | "missed" | "pending";

export interface MatchResult {
  scoreNoteId: number;
  verdict: NoteVerdict;
  /** Signed timing error in ms (heard − expected); undefined if missed. */
  timingErrorMs?: number;
}

/** Song metadata as it appears in the library index.json. */
export interface SongMeta {
  id: string;
  title: string;
  composer: string;
  /** Difficulty 1 (easiest) – 5 (hardest). */
  level: number;
  /** Beats per minute the song is authored at. */
  bpm: number;
  /** Beats per measure (time-signature numerator). */
  beatsPerMeasure: number;
  hands: ("left" | "right")[];
  /** License short code, e.g. "PD", "CC0", "CC-BY-4.0". */
  license: string;
  /** Attribution line, shown on the credits page. */
  attribution: string;
  /** Fun one-liner shown on the song card. */
  blurb?: string;
}

/** A fully loaded song: metadata plus its note events. */
export interface Song extends SongMeta {
  notes: ScoreNote[];
}

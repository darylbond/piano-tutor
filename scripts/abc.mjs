/**
 * Minimal ABC-notation parser → ScoreNote[] (build-time, Node).
 *
 * ABC (https://abcnotation.com) is a compact TEXT format for music, so accurate
 * public-domain transcriptions can be sourced as plain text (unlike binary MIDI)
 * and converted here. We support the melodic subset our library needs:
 * pitches with octave marks, accidentals (with measure persistence + key
 * signatures), note lengths (n, /n, a>b broken rhythm), rests, bar lines, and we
 * ignore chord symbols, decorations, slurs, ties, grace notes, and repeat marks
 * (the tune is played straight through).
 */

const LETTER_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Key signature → set of letters that are sharp (+1) or flat (-1).
const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];
// Fifths (sharps +, flats −) for each major tonic.
const TONIC_FIFTHS = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7,
  F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7,
};
// Mode offset from the major (ionian) key on the same tonic.
const MODE_OFFSET = {
  maj: 0, ion: 0, ionian: 0,
  min: -3, aeo: -3, aeolian: -3, m: -3,
  dor: -2, dorian: -2,
  phr: -4, phrygian: -4,
  lyd: 1, lydian: 1,
  mix: -1, mixolydian: -1,
  loc: -5, locrian: -5,
};

function keyAccidentalMap(key) {
  const norm = key.replace(/\s+/g, "");
  const m = /^([A-G][#b]?)(.*)$/.exec(norm);
  const map = {};
  if (!m) return map;
  const tonic = m[1];
  const modeRaw = m[2].toLowerCase().slice(0, 3); // "dor", "mix", "min"…
  const offset = m[2] ? (MODE_OFFSET[m[2].toLowerCase()] ?? MODE_OFFSET[modeRaw] ?? 0) : 0;
  const fifths = (TONIC_FIFTHS[tonic] ?? 0) + offset;
  if (fifths > 0) for (let i = 0; i < fifths; i++) map[SHARP_ORDER[i]] = 1;
  else if (fifths < 0) for (let i = 0; i < -fifths; i++) map[FLAT_ORDER[i]] = -1;
  return map;
}

/** Parse an ABC tune string into { notes, bpm, beatsPerMeasure }. */
export function parseAbc(abc) {
  const lines = abc.split(/\r?\n/);
  let meter = [4, 4];
  let unitLen = null; // beats per default unit
  let bpm = 100;
  let key = "C";
  const bodyLines = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("%")) continue;
    const header = /^([A-Za-z]):\s*(.*)$/.exec(line);
    if (header && "XTCMLKQRZNOPSWw".includes(header[1])) {
      const [, field, value] = header;
      if (field === "M") {
        if (value.trim() === "C") meter = [4, 4];
        else if (value.trim() === "C|") meter = [2, 2];
        else {
          const m = /(\d+)\s*\/\s*(\d+)/.exec(value);
          if (m) meter = [Number(m[1]), Number(m[2])];
        }
      } else if (field === "L") {
        const m = /(\d+)\s*\/\s*(\d+)/.exec(value);
        if (m) unitLen = (4 * Number(m[1])) / Number(m[2]);
      } else if (field === "Q") {
        const m = /(\d+)\s*$/.exec(value.replace(/".*?"/g, "").trim());
        // Q can be "1/4=120" or "120".
        const eq = /=\s*(\d+)/.exec(value);
        if (eq) bpm = Number(eq[1]);
        else if (m) bpm = Number(m[1]);
      } else if (field === "K") {
        key = value.trim().split(/\s+/)[0] || "C";
      }
      continue;
    }
    if (header) continue; // unknown header line
    bodyLines.push(line);
  }

  const beatsPerMeasure = meter[0] * (4 / meter[1]); // beats (quarter=1) per bar
  if (unitLen == null) {
    const ratio = meter[0] / meter[1];
    unitLen = ratio < 0.75 ? 4 / 16 : 4 / 8; // ABC default L rule
  }

  const keyMap = keyAccidentalMap(key);
  const notes = [];
  let beat = 0;
  let id = 0;
  let measureAcc = {}; // letter+octave -> alter, reset each bar
  let pendingBroken = 0; // >0 lengthen next, <0 shorten next

  const body = bodyLines.join(" ");
  let i = 0;
  const isNoteLetter = (c) => /[A-Ga-g]/.test(c);

  while (i < body.length) {
    const c = body[i];

    // Skip chord symbols / annotations in quotes.
    if (c === '"') {
      const end = body.indexOf('"', i + 1);
      i = end === -1 ? body.length : end + 1;
      continue;
    }
    // Inline fields [K:...], decorations !...!, grace {...}: skip.
    if (c === "!") {
      const end = body.indexOf("!", i + 1);
      i = end === -1 ? body.length : end + 1;
      continue;
    }
    if (c === "{") {
      const end = body.indexOf("}", i + 1);
      i = end === -1 ? body.length : end + 1;
      continue;
    }
    if (c === "[") {
      // inline field like [M:3/4] or chord [CEG]; skip bracket + optional ending digits
      if (/[A-Za-z]:/.test(body.slice(i + 1, i + 3))) {
        const end = body.indexOf("]", i + 1);
        i = end === -1 ? body.length : end + 1;
        continue;
      }
      i++;
      continue;
    }
    if (c === "|" || c === ":" || c === "]") {
      measureAcc = {}; // bar line resets accidentals
      i++;
      continue;
    }
    if (c === ">" ) { pendingBroken = 1; i++; continue; }
    if (c === "<" ) { pendingBroken = -1; i++; continue; }
    if (c === "(" || c === ")" || c === "-" || c === " " || c === "\\") {
      i++;
      continue;
    }
    // digit endings like "1" "2" after "[" already consumed; stray digits: skip
    if (/\d/.test(c) && (i === 0 || !isNoteLetter(body[i - 1]))) {
      // could be a repeat ending number; skip
      i++;
      continue;
    }

    // Accidentals
    let alter = null;
    while (body[i] === "^" || body[i] === "_" || body[i] === "=") {
      if (body[i] === "^") alter = (alter ?? 0) + 1;
      else if (body[i] === "_") alter = (alter ?? 0) - 1;
      else alter = 0; // natural
      i++;
    }

    const letter = body[i];
    if (letter === "z" || letter === "Z" || letter === "x") {
      // rest
      i++;
      const len = readLength(body, i);
      i = len.next;
      let dur = unitLen * len.mult;
      if (pendingBroken !== 0) { dur *= pendingBroken > 0 ? 0.5 : 1.5; pendingBroken = 0; }
      beat += dur;
      continue;
    }
    if (!isNoteLetter(letter)) {
      i++;
      continue;
    }

    // Octave: base octave 4 for uppercase C-B, 5 for lowercase.
    let octave = letter <= "Z" ? 4 : 5;
    i++;
    while (body[i] === "'" || body[i] === ",") {
      if (body[i] === "'") octave += 1;
      else octave -= 1;
      i++;
    }

    const upper = letter.toUpperCase();
    const octKey = upper + octave;
    if (alter != null) measureAcc[octKey] = alter;
    const effAlter = measureAcc[octKey] ?? keyMap[upper] ?? 0;
    const midi = (octave + 1) * 12 + LETTER_SEMITONE[upper] + effAlter;

    const len = readLength(body, i);
    i = len.next;
    let dur = unitLen * len.mult;
    if (pendingBroken !== 0) { dur *= pendingBroken > 0 ? 1.5 : 0.5; pendingBroken = 0; }

    notes.push({
      id: id++,
      midi,
      startBeat: round3(beat),
      durBeats: round3(dur),
      hand: "right",
      measure: Math.floor(beat / beatsPerMeasure) + 1,
    });
    beat += dur;
  }

  return { notes, bpm, beatsPerMeasure: Math.round(beatsPerMeasure) || 4 };
}

/** Read an ABC length suffix like "2", "/2", "/", "3/2" starting at index i. */
function readLength(s, i) {
  let num = "";
  while (/\d/.test(s[i])) num += s[i++];
  let slashes = 0;
  while (s[i] === "/") { slashes++; i++; }
  let den = "";
  while (/\d/.test(s[i])) den += s[i++];

  let mult = num ? Number(num) : 1;
  if (slashes > 0) {
    const d = den ? Number(den) : 2 ** slashes;
    mult = (num ? Number(num) : 1) / d;
  }
  return { mult, next: i };
}

const round3 = (n) => Math.round(n * 1000) / 1000;

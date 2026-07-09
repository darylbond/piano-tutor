# Piano Tutor 🎹

A free, browser-based piano tutorial player for learners of all ages (kids
through adults). Pick a piece from the built-in library, play it on your own
physical piano, and the app **listens through the microphone** (or Web MIDI) and
gives friendly, game-like feedback. Includes short lessons and practice exercises.

- **100% free & static** — hosted on GitHub Pages, no accounts, no servers, no cost.
- **Two views** — **Note Rain** (falling notes) *and* **Sheet Music**, toggle any time.
- **Three ways to play** — Listen, Play-along (wait mode), and Keep-the-beat (rhythm).
- **Listens to a real piano** — mic pitch detection (with a calibration wizard) or MIDI.
- **Privacy first** — mic audio is processed in-memory, never recorded or uploaded.
- **Works offline** — installable PWA; practice needs no Wi-Fi after first load.

## Features

- **Play** — 24 public-domain songs across five levels (Beginner → Expert), from
  Twinkle Twinkle to Mozart's Rondo alla Turca. Searchable and filterable.
  Every run is scored into a star-rated report card; progress is saved on-device.
- **Learn** — short interactive lessons that teach one idea at a time.
- **Practice** — auto-generated exercises (five-finger warm-ups, scales, skips).
- **Progress** — stars per song and totals, with file export/import (no servers).
- **Settings** — volume, key labels, mic sensitivity, and a parent corner with the
  privacy statement and music credits.

## Tech stack

React 19 + Vite + TypeScript · custom canvas Note Rain + SVG staff renderers ·
`pitchy` (McLeod Pitch Method) for mic detection · Web MIDI · Web Audio synth ·
Zustand + localStorage · `vite-plugin-pwa` · Vitest. All input (mic, MIDI,
on-screen keyboard) flows through one `NoteEvent` contract, keeping the scoring
engine pure and unit-tested.

## Develop

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (engine: music, matcher, rhythm, scorer, staff…)
npm run build      # production build -> dist/
node scripts/gen-songs.mjs   # regenerate the song library from source notation
```

Deploys to GitHub Pages via GitHub Actions on push to `main`.

## Contributing

Song submissions and code contributions are welcome. All bundled music must be
public-domain or appropriately licensed with attribution metadata; the build
pipeline generates the in-app credits automatically.

## License

Code is [MIT](LICENSE). Bundled music is public domain or CC-licensed; see the
in-app credits (Settings → For grown-ups) for full attributions.

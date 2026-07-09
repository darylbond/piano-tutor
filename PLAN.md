# Piano Tutor — Project Plan

A free, browser-based piano tutorial player for kids (~age 10). The student picks a
piece from a built-in library of free/public-domain music, the app **listens through
the microphone** while they play their own physical piano, and gives friendly,
game-like feedback. Short exercises and bite-size lessons round it out.

- **Hosting:** 100% static site on GitHub Pages. No backend, no accounts, no cost.
- **Audience:** ~10-year-old students, possibly supervised by a parent/teacher.
- **Instrument:** a separate physical piano (acoustic or digital) — the app hears it
  via the mic. (Web MIDI is a bonus path for digital pianos, see §4.3.)

---

## 1. Product goals & non-goals

### Goals
1. Pick a song → see the notes → play along → get instant, encouraging feedback.
2. A practice loop that measurably improves accuracy and rhythm over weeks.
3. Zero friction: no sign-up, no install, works on a laptop/tablet in Chrome.
4. Kid-proof UI: big targets, few words, icons + audio cues, no dead ends.
5. Everything free: code (MIT), content (public domain / CC), hosting (Pages).

### Non-goals (v1)
- Teaching sight-reading theory in depth (we link out / keep lessons short).
- Grading polyphonic two-hand performances note-perfectly (see §4.2 — we start
  monophonic and grow into polyphony).
- Mobile-phone support (mic + tiny screen is a bad combo; tablet+ is the target).
- Social features, accounts, servers of any kind.

---

## 2. The core experience

### 2.1 Three modes
| Mode | What it is | Session length |
|---|---|---|
| **Learn** | Bite-size lessons: "Find middle C", "Quarter notes", "C major scale". Each lesson = 1 concept + 1 interactive check. | 2–5 min |
| **Practice** | Exercises: scales, five-finger patterns, rhythm clapping/tapping, interval echo ("I play, you copy"). Auto-generated, difficulty ramps. | 3–10 min |
| **Play** | The song library. Sheet music scrolls with a moving cursor; the app listens and scores each note; end-of-piece report with stars. | 5–15 min |

### 2.2 The play-along loop (the heart of the app)
1. Student picks a song (filter by level 1–5, shown as ⭐ difficulty).
2. **Listen first** — the app plays the piece with a built-in piano sound while the
   current view animates (note rain falls, or the notation cursor moves).
3. **Wait mode (default)** — the cursor waits at each note until the student plays
   the right pitch. Impossible to fail; ideal for learning.
4. **Rhythm mode** — a metronome/backing keeps time; notes are scored for pitch
   *and* timing (early/late/missed). Tempo slider 50–100%, unlocks stars.
5. **Report card** — accuracy %, streaks, "tricky bars" highlighted; one-tap
   "practice just these bars" loop.

### 2.3 Two ways to see the music: Note Rain & Sheet View
Every song works in **both** visualizations — a one-tap toggle, remembered per user:

- **Note Rain (default for levels 1–2):** Synthesia-style falling notes over an
  on-screen keyboard. Notes descend as colored bars (blue = right hand, orange =
  left), length = duration, and strike the correct key exactly on the beat. Keys
  are labeled (C, D, E…) and light up green when the student plays them. Zero
  notation literacy required — this is the on-ramp.
- **Sheet View:** real notation via OSMD with a follow cursor — the destination.
  Levels 3+ default here, and lessons explicitly bridge the two ("this falling bar
  IS this notehead").
- **Combo mode:** sheet on top, a slim rain strip + keyboard below, so the mapping
  from bars to noteheads is learned by osmosis rather than taught.

Both views are renderers over the same `notes.json` + playhead + scoring state —
the engine doesn't know which one is on screen. Rain is drawn on a `<canvas>`
(hundreds of moving sprites at 60 fps; DOM/SVG won't hold up on cheap laptops).

### 2.4 Feedback language (10-year-old calibrated)
- Never "wrong": notes light **green** (got it), **amber** (close/late), or gently
  pulse until played (wait mode).
- Mascot micro-celebrations on streaks; stars (1–3) per piece per tempo.
- Progress = a simple "practice garden/map" that fills in — visible growth, no
  leaderboards, no timers that punish.

---

## 3. Content: the free music library

### 3.1 Sources (all legally redistributable)
| Source | What we take | License |
|---|---|---|
| **Mutopia Project** | Classical pieces with LilyPond/MusicXML source | Public domain / CC |
| **OpenScore (MuseScore)** | Lieder & classical transcriptions, MusicXML | CC0 / CC-BY |
| **IMSLP** | Public-domain scores (where MusicXML exists) | PD |
| **Traditional/folk tunes** | Ode to Joy, Twinkle, Mary Had a Little Lamb, folk songs — we engrave our own MusicXML | PD (we own the engraving) |
| **Original exercises** | Scales, five-finger drills, rhythm patterns — generated | Ours, MIT |

v1 library target: **~40 pieces** curated across 5 levels, weighted heavily toward
levels 1–2 (single-hand melodies), because that's where a 10-year-old beginner lives.

### 3.2 Build-time content pipeline (no runtime parsing surprises)
```
content/sources/*.musicxml|*.ly
        │  scripts/build-library.ts (Node, runs in CI)
        ▼
public/library/{id}/score.musicxml   ← for notation rendering
public/library/{id}/notes.json       ← flat note-event list for the scoring engine
public/library/index.json            ← title, composer, level, license, attribution
```
- `notes.json` = `[{ midi, startBeat, durBeats, hand, measure }]` — the scoring
  engine never touches MusicXML at runtime.
- Pipeline validates range (fits a 61-key keyboard for levels 1–3), monophony for
  level 1–2 tags, and **emits an ATTRIBUTIONS page automatically** from license
  metadata — CC-BY compliance is build-enforced, not remembered.

### 3.3 Searching & adding songs
Three tiers, all serverless:

1. **Library search (v1):** instant client-side search over `index.json` — title,
   composer, tags — with level/hand filters. At ~40–200 entries this is a simple
   in-memory filter; if the catalog grows past that, drop in Fuse.js for fuzzy
   matching. Kid-facing: a big search box with icon-chip filters.
2. **"Add a Song" importer (v1.x):** parent/teacher-facing screen that accepts
   **MusicXML (.musicxml/.mxl)** or **MIDI (.mid)** files from disk — or a pasted
   URL to a raw file (fetched client-side; works for CORS-friendly hosts like
   GitHub raw). The same normalization/validation code as the build pipeline
   (shared TS module) runs **in the browser**, producing `notes.json` + metadata,
   stored in IndexedDB. Imported songs appear in the library under a "My Songs"
   shelf, fully playable in both views, and are included in progress export/import.
   Where to get files is documented in the parent corner: MuseScore.com downloads,
   Mutopia, or "export MusicXML from any notation app".
3. **Community library growth (ongoing):** the built-in catalog lives in the repo,
   so anyone can add a song via a GitHub pull request — CI runs the pipeline,
   validates the license metadata, and the song ships with the next deploy. A
   `CONTRIBUTING.md` with a song-submission template makes this teacher-friendly.

Explicitly out of scope: live searching external catalogs (IMSLP, MuseScore.com)
from the app — they have no CORS-accessible APIs suitable for this, and scraping
would be fragile and legally murky. The importer + PR path covers the need.

---

## 4. The hard part: listening to a real piano

This is the make-or-break subsystem, so the plan is honest about physics:
**real-time monophonic pitch detection in a browser is a solved problem; real-time
polyphonic is not quite.** We design for that.

### 4.1 Tier 1 (v1): monophonic real-time detection
- **Pipeline:** `getUserMedia` → `AudioWorklet` (dedicated thread) → pitch detector.
- **Algorithm:** autocorrelation-family detector — **pitchy** (McLeod Pitch Method,
  MIT, tiny) running on ~2048-sample windows at 44.1 kHz ≈ 46 ms latency, hop of
  ~10–20 ms, with a clarity threshold to reject room noise.
- **Onset detection:** spectral-flux/energy rise gate in the worklet so we score a
  *keypress*, not 300 ms of sustained string — this is what makes rhythm scoring
  possible on an acoustic piano.
- **Octave forgiveness (kid mode):** match pitch-class first, exact octave earns the
  third star. Cheap autocorrelation detectors octave-glitch; the UX absorbs it.
- Levels 1–2 content is monophonic *by curation*, so v1 ships fully working.

### 4.2 Tier 2 (v1.x): light polyphony
- **Spotify Basic Pitch** (Apache-2.0) has a TensorFlow.js build that runs in the
  browser — polyphonic note transcription. It's near-real-time in ~1 s chunks: fine
  for **end-of-phrase scoring** ("play these 2 bars, then I'll check"), not for the
  live cursor. That's exactly how we'll use it for level 3+ pieces with intervals
  and simple left-hand parts.
- Fallback design rule: **every scoring feature must degrade to "listen, then
  grade the phrase"** so polyphonic content is never blocked on real-time DSP.

### 4.3 Bonus tier: Web MIDI (free accuracy for digital pianos)
- If the student's piano has USB, `navigator.requestMIDIAccess()` gives perfect
  note+velocity+timing data. Same scoring engine, different input adapter.
- Detection is automatic: if a MIDI input appears, offer "Connect your piano 🎹".
- This costs ~1 week and makes the app *excellent* for the large share of learners
  on digital pianos — but the mic path remains the primary design constraint.

### 4.4 Calibration & robustness (do not skip — this is where kid apps die)
- **First-run "tuning check" wizard:** play middle C three times → we set noise
  floor, input gain advice, and verify the piano's tuning offset (acoustic pianos
  drift; we store a cents-offset and apply it globally).
- Latency compensation: measured click-to-mic round trip stored per device.
- Clear failure UX: if the mic hears nothing for 10 s, a friendly "I can't hear
  your piano — is it close enough?" helper, never a silent broken screen.
- All detection thresholds tunable via a hidden `?debug` panel for real-world tests.

---

## 5. Architecture & tech stack

### 5.1 Stack (chosen for: static, long-lived, kid-fast)
| Concern | Choice | Why |
|---|---|---|
| Framework | **React 19 + Vite + TypeScript** | Huge ecosystem and contributor familiarity, first-class tooling, trivial static build. Perf note: the 60 fps surfaces (note rain, cursor, mic meter) render on canvas/imperative refs driven by `requestAnimationFrame` — React state is for UI chrome, never per-frame updates. |
| Notation | **OpenSheetMusicDisplay (OSMD)** | Best-in-class MusicXML rendering (VexFlow under the hood), built-in follow cursor, BSD license. |
| Mic pitch | **pitchy** in an **AudioWorklet** | MIT, small, MPM is robust for piano monophony. |
| Polyphonic (later) | **@spotify/basic-pitch** (TF.js) | Only credible in-browser polyphonic transcriber; Apache-2.0. Lazy-loaded only for level 3+ scoring. |
| Playback sounds | **smplr** (SoundFont player) | Real piano samples, MIT, loads from static files we self-host (Pages-friendly, offline-friendly). |
| Scheduling | Web Audio clock + lookahead scheduler | The standard Chris Wilson "tale of two clocks" pattern; `setTimeout` is not a metronome. |
| State/persistence | **Zustand** + localStorage (settings/progress, versioned schema) + **IndexedDB** via `idb` (user-imported songs) | Zustand is tiny and works outside React components (the audio engine can update state from a worklet callback). Progress export/import as a file so it can move between devices without a server. |
| PWA | `vite-plugin-pwa` | Full offline after first visit — practice doesn't need Wi-Fi. |
| Testing | **Vitest** (unit) + **Playwright** (e2e) | Scoring engine gets golden-file tests with recorded piano WAVs as fixtures. |
| CI/CD | GitHub Actions → GitHub Pages | Build library + app + tests on every push to `main`. |

### 5.2 Module layout
```
src/
  audio/
    mic.ts            # getUserMedia, permissions UX, device selection
    pitch-worklet.ts  # AudioWorklet: onset gate + pitchy detection → NoteEvents
    midi.ts           # Web MIDI adapter → NoteEvents (same interface)
    player.ts         # smplr playback + lookahead scheduler + metronome
    calibration.ts    # noise floor, latency, tuning offset
  engine/
    types.ts          # NoteEvent, ScoreNote, MatchResult — the shared contract
    matcher.ts        # heard-note ↔ expected-note alignment (wait & rhythm modes)
    scorer.ts         # accuracy, timing windows, streaks, star thresholds
    session.ts        # a practice run: state machine (ready→playing→report)
  library/
    catalog.ts        # loads index.json + IndexedDB "My Songs", search & filters
    score-loader.ts   # fetch + parse notes.json / MusicXML
    importer.ts       # MusicXML/MIDI file & URL import → validate → IndexedDB
                      # (shares normalization code with content/ build pipeline)
  lessons/
    lesson-runner.ts  # step-based interactive lesson engine (data-driven JSON)
    exercises.ts      # generators: scales, five-finger, rhythm, echo
  ui/
    routes/           # Home, Library, Play, Learn, Practice, Progress, Settings
    components/       # SheetView (OSMD wrapper), NoteRainView (canvas renderer),
                      # KeyboardView (on-screen keys, shared by rain/lessons),
                      # BigButton, StarBar, Mascot, MicMeter, TempoSlider,
                      # ReportCard...
  store/
    progress.ts       # versioned localStorage persistence + export/import
content/              # source scores + build pipeline (see §3.2)
```

**Key contract:** everything that hears (mic, MIDI, even a debug on-screen keyboard)
emits the same `NoteEvent {midi, velocity?, timeMs, source}`. The engine is
input-agnostic and 100% unit-testable without audio hardware.

### 5.3 Scoring engine (deterministic, testable)
- **Wait mode:** advance cursor when pitch-class (or exact pitch) matches the
  expected note; ignore everything else. Trivial, robust, ships first.
- **Rhythm mode:** each expected note gets a timing window (±120 ms "perfect",
  ±250 ms "good", scaled by tempo). Greedy nearest-match alignment of heard events
  to expected events; unmatched expected = miss, unmatched heard = extra (ignored
  at low levels, penalized at high).
- Golden tests: fixture WAVs (recorded real piano, digital piano, laptop mic in a
  noisy room) → pipeline → expected score JSON. Regressions in DSP tuning get
  caught in CI, not by a frustrated kid.

---

## 6. UX & design system for a 10-year-old

- **One primary action per screen.** Home = three giant cards: Learn / Practice / Play.
- Reading level: short words, icons everywhere, optional voice-over cues (Web
  Speech API, off by default).
- Big type (18 px minimum), fat touch targets (≥48 px), high-contrast friendly
  palette, respects `prefers-reduced-motion`.
- A mascot (simple SVG animal) delivers all feedback — praise is specific ("You
  nailed the tricky bit in bar 3!") and generated from the score data.
- **No dark patterns:** no fake urgency, no infinite sessions — after ~15 min the
  mascot suggests a break.
- Parent corner (small link, text-heavy on purpose): progress detail, mic
  troubleshooting, license attributions, data statement ("everything stays on this
  device — we have no servers").
- Privacy is a feature: mic audio is processed in-memory and never recorded or
  transmitted. Stated plainly, kid-and-parent readable. No analytics in v1.

---

## 7. Milestones

| # | Milestone | Contents | Exit criterion |
|---|---|---|---|
| 0 | **Skeleton** (wk 1) | Vite+Svelte+TS, Pages deploy via Actions, routing, design tokens | App live at `*.github.io`, CI green |
| 1 | **Sound & score** (wk 2–3) | Note Rain canvas renderer + on-screen keyboard, OSMD render + cursor, view toggle, smplr playback, metronome, 5 hand-made level-1 songs, "Listen" mode | Pick a song, watch/hear it play in both views |
| 2 | **Ears** (wk 3–5) | Mic pipeline, pitch worklet, onset gate, calibration wizard, debug panel | Middle-C tuner demo works on a real piano in a normal room |
| 3 | **Wait mode** (wk 5–6) | Matcher + advance logic, green-note feedback in both views (rain pauses at the keyboard until the right key is heard), report card, stars, localStorage progress | A child can learn Ode to Joy start-to-finish in Note Rain view |
| 4 | **Rhythm mode** (wk 6–8) | Timing windows, tempo slider, streaks, tricky-bar loop practice | Scored play-through with meaningful accuracy % |
| 5 | **Library & pipeline** (wk 8–9) | Content build pipeline, ~40 curated pieces, attribution page, client-side search + level filters, CONTRIBUTING.md song-submission path | Library searchable, licenses auto-generated |
| 6 | **Learn & Practice** (wk 9–11) | Lesson runner + ~12 lessons, exercise generators (scales, echo, rhythm taps) | New student path: lesson 1 → first song |
| 7 | **Polish** (wk 11–12) | Mascot/celebrations, PWA offline, progress garden, parent corner, a11y pass, kid usability test round | v1.0 tag |
| 8 | **v1.x** | Web MIDI adapter; Basic Pitch phrase-scoring for level 3+; "Add a Song" MusicXML/MIDI importer (§3.3) | — |

Each milestone is demoable and deployed; the app is never broken on `main`.

## 8. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Mic detection flaky on acoustic pianos in echoey rooms | **High** | Onset gate + clarity threshold + calibration wizard; octave forgiveness; wait mode (untimed) as default; fixture-WAV regression tests |
| Real-time polyphony infeasible | Certain (v1) | Curate levels 1–2 monophonic; phrase-based Basic Pitch scoring for higher levels; Web MIDI path |
| Laptop speakers leak playback into mic during play-along | Medium | Default: metronome-only while scoring; playback and scoring never simultaneous unless headphones confirmed in setup |
| MusicXML variety breaks pipeline | Medium | Build-time validation; curated (not bulk-imported) library |
| Kids bounce off setup friction | Medium | Mic permission asked only when entering Play/Practice, with a "why" screen; full Listen/Learn experience works with zero permissions |
| iPad/Safari audio quirks (worklet, autoplay policies) | Medium | Audio unlocked on first tap (standard pattern); Playwright smoke on WebKit; Chrome/Edge as tier-1 targets |

## 9. Success criteria for v1
- A real 10-year-old, unassisted, gets from landing page to a green-note play-through
  of a level-1 song in **under 3 minutes** including mic permission.
- Pitch detection ≥95% correct on the fixture suite (digital piano, quiet room) and
  ≥85% (acoustic, normal room).
- Lighthouse: performance ≥90 on a low-end laptop profile; a11y ≥95.
- Total first-load ≤ ~1.5 MB gzipped (TF.js/Basic Pitch lazy-loaded only when needed).

# Performance plan — smooth play-along on older tablets (Galaxy Tab)

Target: steady frame pacing (no stutter) in Note Rain + play-along/rhythm on a
low-end Android tablet.

## Done (this pass)

- **[x] Windowed note-rain rendering** (`engine/note-rain.ts`). Per-note start/end
  ms and key geometry are precomputed once in `setNotes` (sorted by start); each
  frame only touches notes inside the lookahead window via an advancing cursor,
  and computes sounding keys in the same pass. Was O(all notes × keys)/frame.
- **[x] Offscreen keyboard cache + glow sprite.** The idle keyboard is rendered
  once to an offscreen canvas and blitted (one `drawImage`); only lit keys are
  repainted. `shadowBlur` (very slow on old Skia) replaced by a pre-rendered
  radial glow sprite.
- **[x] Cheaper context + adaptive resolution.** Context is `{ alpha: false,
  desynchronized: true }`; DPR capped at 1.5 on coarse-pointer devices. Frame
  intervals are sampled every frame (cheap) and the backing resolution steps
  down (1 → 0.8 → 0.66) if p95 frame time stays > 24 ms — automatic, no overlay
  needed.
- **[x] Frame-time overlay.** Toggle in Settings → "For grown-ups → Show
  performance overlay". Draws fps avg / p95 / draw-ms / dropped / quality.
- **[x] Mic analysis throttled to ~30 Hz** (`audio/mic.ts`, `analysisIntervalMs`).
  The McLeod pitch method was running on every rAF on the main thread; onsets
  only need ~30 Hz (refractory window is 140 ms).
- **[x] SheetView recolor-on-change** (`ui/components/SheetView.tsx`). Noteheads
  are recolored only when their color actually changes, not 60×/s; scroll uses a
  compositable `translate3d` + `will-change`.
- **[x] Quantized progress state** (`ui/routes/PlayScreen.tsx`). Listen/rhythm
  interval `setProgressPct` values are rounded so React skips identical-value
  re-renders.

Verified: `tsc` clean, 76/76 tests pass, production build + dev server OK.
Measure before/after on the actual tablet via the performance overlay.

## Deferred (do only if the tablet still stutters after measuring)

- **Mic in a Worker/AudioWorklet.** The 30 Hz throttle is the cheap win; moving
  pitch detection fully off the main thread is the proper fix if the mic is
  still a hotspot with the overlay showing high draw-ms while listening.
- **SheetView windowed cull.** Big songs still mount every notehead as SVG. If
  Sheet view (non-default) stutters on long pieces, render only noteheads within
  ~2 screens of the cursor, updating the visible range a few times/sec (not per
  frame) to avoid re-render churn. Left out to avoid regressing the current
  React-free scroll loop without on-device evidence it's needed.

## Notes
- Rhythm-mode timing architecture untouched (audio-clock anchored — already
  load-immune); these changes only reduce load so the visuals keep up.
- Synth and CSS are fine; no work needed there.

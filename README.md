# Piano Tutor 🎹

A free, browser-based piano tutorial player for kids (~age 10). Pick a piece from a
library of free/public-domain music, play it on your own physical piano, and the app
**listens through the microphone** and gives friendly, game-like feedback. Includes
short lessons and practice exercises.

- **100% free & static** — hosted on GitHub Pages, no accounts, no servers, no cost.
- **Note Rain** (falling-notes) *and* **Sheet Music** views over the same songs.
- **Listens to a real piano** via mic pitch detection (Web MIDI supported too).
- **Privacy first** — mic audio is processed in-memory, never recorded or uploaded.

> Status: **planning / early development.** See [PLAN.md](PLAN.md) for the full
> design, architecture, milestones, and technical decisions.

## Tech stack (planned)
React 19 + Vite + TypeScript · OpenSheetMusicDisplay · `pitchy` (AudioWorklet) ·
smplr (SoundFont playback) · Zustand · PWA · deployed via GitHub Actions → Pages.

## Contributing
Song submissions and code contributions are welcome — see `CONTRIBUTING.md` (coming
soon). All bundled music must be public-domain or appropriately licensed with
attribution metadata.

## License
Code is [MIT](LICENSE). Bundled music is public-domain or CC-licensed; attributions
are generated into the app's credits page.

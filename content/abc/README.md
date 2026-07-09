# ABC song sources

Drop a `.abc` file here and it becomes a bundled song automatically — no code
changes. Run `npm run build:library` (or `node scripts/gen-songs.mjs`) to
regenerate `public/library/`.

ABC (https://abcnotation.com) is a compact **text** format, so accurate
public-domain transcriptions can be sourced as plain text from known-good
collections (abcnotation.com, thesession.org, John Chambers' collection) and
converted faithfully — unlike hand transcription.

## Metadata

Standard ABC headers carry the musical data. App-specific catalog fields are
declared as `%%` stylesheet directives, which standard ABC tools ignore — so the
file stays a valid, portable tune.

```abc
%%id fur-elise
%%level 3
%%blurb One of the most famous tunes ever.
%%license PD
%%attribution Beethoven, "Für Elise" (1810). Public domain. ABC: F. Nordberg.
%%reps 1
X:1
T:Für Elise
C:Ludwig van Beethoven
M:3/4
L:1/8
Q:1/4=72
K:C
e^d|:e^deB=dc|A2 z CE A|...
```

| Directive | Meaning | Default |
|---|---|---|
| `%%id` | catalog id / slug | slug of filename |
| `%%level` | difficulty 1–5 | 3 |
| `%%blurb` | one-line description | "" |
| `%%license` | PD, CC0, … | PD |
| `%%attribution` | credit line | "<title>. Public domain." |
| `%%reps` | times played through (length scaling) | by level |
| `%%bpm` | override tempo | ABC `Q:` header |
| `%%meter` | override beats/measure | ABC `M:` header |

`T:` sets the title, `C:` sets the composer. A file here **overrides** an inline
song in `scripts/gen-songs.mjs` with the same id, so the library migrates to
verified sources one file at a time.

# Cadence — App Store screenshots

A reusable, one-command pipeline that turns the live app into finished, Cal-AI-style
App Store screenshots (big bold headline on a light background, floating phone).

## Generate everything

```sh
npm run shots
```

This starts the dev server, captures fresh app screens, frames them, and stops the
server. Output lands in `screenshots/final/<size>/` (e.g. `6.7/01-tasks.png`), sized
exactly for App Store Connect. Upload those directly.

Only re-frame (skip re-capturing the app) after editing captions/colors:

```sh
npm run shots:frame
```

## Folders

| Path | What |
| --- | --- |
| `config.mjs` | **The file you edit.** Slides, headlines, colors, export sizes. |
| `capture.mjs` | Boots the app headless, seeds demo data, screenshots each tab → `raw/` |
| `base.mjs` | The framing engine (Cal-AI theme). `raw/` → `final/` |
| `run.mjs` | Orchestrates dev-server + capture + frame (what `npm run shots` calls) |
| `raw/` | Bare app screens, 1290×2796 — usable as-is if you skip framing |
| `final/<size>/` | Finished, framed slides per export size |

## Editing

Everything lives in **`config.mjs`**:

- **Headlines** — wrap the accent word in `*asterisks*`: `'Reach every *goal*'`.
- **Backgrounds** — per-slide `bg` hex.
- **Add / reorder / remove** slides — edit the `slides` array. `raw` must match a
  screen produced by `capture.mjs`.
- **Export sizes** — add to `project.exportSizes` (6.7" is required by Apple; the
  iPad 13" size is included but commented out — enable it only if you ship iPad).
- **Theme** — font, headline size/position, phone size, accent color in `theme`.

## Capturing a new screen

To add a screen (e.g. a future "Insights" tab): add a `shot()` call in `capture.mjs`
for it, then reference the new `raw` filename from a slide in `config.mjs`.

Demo data (tasks, goals, notes, a 6-day streak) is seeded fresh each run inside
`capture.mjs` — change it there to alter what the screens show.

## Requirements

`playwright` is a devDependency; the Chromium browser is installed via
`npx playwright install chromium` (already done once on this machine).

# Cadence

A small companion to the Unio Dashboard. Keep your daily rhythm: **tasks · goals · streaks**. Local-first (works offline), same design language, ready to sync across devices later.

## Stack

React 19 · TypeScript · Vite · Dexie (IndexedDB) · lucide-react · Capacitor 6 (iOS + Android shells)

## Layout

```
src/
  main.tsx            entry — applies persisted theme/accent before first paint
  App.tsx             app shell: login gate, tab nav, dashboard wiring
  data.ts             Dexie schema + all data operations (single data layer)
  index.css           all styles (design tokens + components)
  components/         shared UI: dialogs/toast (ui.tsx), DatePicker, Login,
                      CadenceMark, Confetti, BrandLogo
  features/           one file per tab: Tasks, Notes, Goals, Streak, Profile,
                      Settings
  lib/                helpers: format.ts (dates, colors, files), pdf.ts (export)
ios/App/              Capacitor iOS shell — App.xcworkspace is what you build.
                      Pods/ and App/public/ are committed so Xcode Cloud can
                      build with no Node/CocoaPods step (see IOS-BUILD.md)
android/              Capacitor Android shell (web assets copied at build time)
screenshots/          App Store screenshot pipeline (Playwright) + final sets
showcase/             marketing/App Store imagery
scripts/              icon generation
```

## Run

```sh
npm install
npm run dev     # http://localhost:4400
```

Build / preview:

```sh
npm run build   # static output in dist/
npm run preview
```

## Mobile

```sh
npm run mobile:sync     # vite build + cap sync (updates ios/ and android/)
npm run mobile:ios      # opens ios/App/App.xcworkspace in Xcode
npm run mobile:android  # opens android/ in Android Studio
```

After changing web code, re-run `npm run mobile:sync` (or at minimum
`npm run build && npx cap copy ios`) so the committed iOS bundle in
`ios/App/App/public/` stays current — Xcode Cloud builds from what's committed.

iOS build/release details: see [IOS-BUILD.md](IOS-BUILD.md).
App Store submission status + steps: see [docs/APP-STORE-CHECKLIST.md](docs/APP-STORE-CHECKLIST.md).

## Deploy (web)

`npm run build` emits a static `dist/` — drop it on any static host:

- **Vercel / Netlify**: point at this folder, build `npm run build`, output `dist`.
- Or any static server: `npx serve dist`.

## Data & cross-device sync

All data lives in IndexedDB (`cadence_db`: `tasks`, `goals`, `checkins`). Every
write also appends to a `syncQueue` table — so adding a backend later means
implementing one function, `processSync()` in `src/data.ts`, with no UI changes.

Sync backend is **not wired yet** (chosen "decide later"). When ready, the
cheapest path is to reuse the Unio Supabase project + auth and push the queue
there (same pattern as the Dashboard's offline-first layer).

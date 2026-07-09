# Cadence

A small companion to the Unio Dashboard. Keep your daily rhythm: **tasks · goals · streaks**. Local-first (works offline), same design language, ready to sync across devices later.

## Stack

React 19 · TypeScript · Vite · Dexie (IndexedDB) · lucide-react

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

## Deploy

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

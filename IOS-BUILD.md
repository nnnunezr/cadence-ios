# Cadence — iOS build & release

The iOS shell lives at `ios/App` (bundle id `com.unio.cadence`). Always build
**`ios/App/App.xcworkspace`** (not the `.xcodeproj`) so the CocoaPods targets
resolve.

## How the repo is wired for Xcode Cloud

- `ios/App/Pods/` and `ios/App/App/public/` (the built web bundle) are
  **committed**, so Xcode Cloud can archive the workspace even with no
  Node/CocoaPods step.
- `ios/App/ci_scripts/ci_post_clone.sh` additionally rebuilds everything from
  source on each cloud build (installs Node via Homebrew, `npm ci`,
  `npm run build`, `cap sync ios`, `pod install`). This keeps cloud builds
  correct even if the committed bundle is stale. Xcode Cloud picks the folder
  up because it sits next to the workspace it builds.
- Signing on the `App` target is **Automatic** — Xcode Cloud manages
  certificates and profiles (team `75B8BKR2GT`).

After changing web code, run `npm run mobile:sync` (or
`npm run build && npx cap copy ios`) and commit the refreshed
`ios/App/App/public/` so local and cloud builds agree.

## Local build (Xcode on this Mac)

```sh
npm run mobile:sync          # vite build + cap sync (runs pod install)
npm run mobile:ios           # opens ios/App/App.xcworkspace in Xcode
```

In Xcode:
- Target **App** → Signing & Capabilities → Team set, bundle id
  `com.unio.cadence`, Automatic signing.
- Set Version/Build, pick a device or "Any iOS Device (arm64)".

## Ship a beta (TestFlight)

Either push to `main` and let the Xcode Cloud workflow archive/upload, or
locally:

1. Xcode → **Product ▸ Archive**.
2. Organizer → **Distribute App ▸ App Store Connect ▸ Upload**.
3. App Store Connect ▸ TestFlight → add build to a tester group.

## Notes

- App icon lives in `ios/App/App/Assets.xcassets/AppIcon.appiconset`
  (generated via `scripts/gen-icons.py`).
- App Store screenshots: `npm run shots` (see `screenshots/`).
- The app is fully offline (IndexedDB) — no backend needed for beta review.

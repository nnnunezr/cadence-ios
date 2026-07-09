# Cadence — iOS beta build

The iOS project exists (`ios/App`, bundle id `com.unio.cadence`) and its web assets
are synced. Building an actual **beta (TestFlight)** can't be done in this dev
environment — it needs the full Apple toolchain + a paid Apple Developer account.
Do the following on a Mac with Xcode.

## Prerequisites (one-time)

1. **Xcode** (full app, from the Mac App Store) — not just Command Line Tools.
   ```sh
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   xcodebuild -version            # confirm it works
   ```
2. **CocoaPods**
   ```sh
   sudo gem install cocoapods     # or: brew install cocoapods
   ```
3. **Apple Developer Program** membership ($99/yr) + an **App Store Connect** app
   record for bundle id `com.unio.cadence`.

## Build + run locally

```sh
cd /Users/nata/Desktop/Unio/Cadence
npm run mobile:sync          # vite build + cap sync (runs pod install)
npm run mobile:ios           # opens ios/App/App.xcworkspace in Xcode
```

In Xcode:
- Select the **App** target → **Signing & Capabilities** → pick your **Team**
  (enables automatic signing). Confirm Bundle Identifier = `com.unio.cadence`.
- Set a **Version** (e.g. 0.1.0) and **Build** number.
- Pick a real device or "Any iOS Device (arm64)".

## Ship the beta (TestFlight)

1. Xcode → **Product ▸ Archive**.
2. Organizer opens → **Distribute App ▸ App Store Connect ▸ Upload**.
3. In **App Store Connect ▸ TestFlight**, add the build to a tester group and
   invite testers (internal = instant; external = quick Beta App Review).

## Optional: automate with fastlane

```sh
sudo gem install fastlane
cd ios/App && fastlane init      # choose "manual"
```

`ios/App/fastlane/Fastfile`:
```ruby
default_platform(:ios)
platform :ios do
  lane :beta do
    build_app(workspace: "App.xcworkspace", scheme: "App")
    upload_to_testflight(skip_waiting_for_build_processing: true)
  end
end
```
Run `fastlane beta` (auth via an App Store Connect API key — set
`APP_STORE_CONNECT_API_KEY` or use `app_store_connect_api_key`).

## Notes

- App icon is still the Capacitor default — replace
  `ios/App/App/Assets.xcassets/AppIcon.appiconset` before public beta.
- Re-run `npm run mobile:sync` after any web change to push the new bundle in.
- The app is fully offline (IndexedDB), so no backend is required for the beta.

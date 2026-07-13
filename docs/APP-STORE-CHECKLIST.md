# Cadence — App Store submission checklist

Snapshot of what's ready in the repo and what still has to be done in App Store
Connect (account-side, can't be automated from here).

## Ready in the repo ✅

- **Bundle id** `com.unio.cadence`, team `75B8BKR2GT`
- **Version** `1.0.0` (build `1`) — `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`
- **App icon** — 1024×1024, opaque (no alpha), real Cadence mark
  (`ios/App/App/Assets.xcassets/AppIcon.appiconset`)
- **Privacy manifest** — `ios/App/App/PrivacyInfo.xcprivacy`, wired into the
  target's Copy Bundle Resources: tracking off, **no data collected**,
  required-reason APIs declared (UserDefaults CA92.1, FileTimestamp C617.1,
  DiskSpace E174.1) for the Preferences + Filesystem plugins
- **Usage strings** — camera + photo-library `NS…UsageDescription` in Info.plist
- **Export compliance** — `ITSAppUsesNonExemptEncryption = false` (no
  encryption prompt at upload)
- **Device support** — `arm64`, portrait only, iOS 13.0+ deployment target
- **Screenshots** — `screenshots/final/6.7` (1290×2796) and
  `screenshots/final/6.5` (1242×2688): five each (tasks, streak, goals, notes,
  you)
- **Privacy Policy** — `docs/PRIVACY.md` · **Support** — `docs/SUPPORT.md`
  (public raw GitHub URLs work as the ASC Privacy Policy / Support URLs)
- **Xcode Cloud** — committed Pods + web bundle + `ios/App/ci_scripts/
  ci_post_clone.sh`; Automatic (managed) signing

## Still to do in App Store Connect ⏳

1. **App record** for `com.unio.cadence` (Productivity category).
2. **Signing/build:** push `main` → let the Xcode Cloud workflow archive +
   upload to TestFlight, or archive locally (see [IOS-BUILD.md](../IOS-BUILD.md)).
   Xcode Cloud manages certs/profiles — no local signing setup needed.
3. **App Privacy** section: select **Data Not Collected** (matches the
   manifest).
4. **Age rating:** answer all questionnaire items "None" → 4+.
5. **URLs:** set Privacy Policy URL and Support URL to the raw GitHub links for
   `docs/PRIVACY.md` and `docs/SUPPORT.md` (confirm they're pushed and load —
   untracked files 404 and cause rejection).
6. **Screenshots:** upload the 6.7" set to the 6.9"/6.7" slot and the 6.5" set
   to the 6.5" slot (wrong size in wrong slot → "dimensions are wrong").
7. **Review notes:** the sign-in is a **local email-only gate** — add
   "Enter any email to continue; no password, no account, nothing leaves the
   device." Leave the "Sign-in required" demo-account box **unchecked**.
8. **EU trader status** (Business settings) — required or the app can't ship in
   the EU.
9. Fill description, keywords, promotional text, primary language.
10. Submit for review.

## Notes

- After any web change: `npm run mobile:sync` (or `npm run build && npx cap copy
  ios`) and commit the refreshed `ios/App/App/public/` so cloud/local builds
  agree.
- Privacy Policy raw URL pattern:
  `https://raw.githubusercontent.com/<owner>/<repo>/main/docs/PRIVACY.md`
  (or a rendered `blob/main/docs/PRIVACY.md` link).

#!/bin/sh
# Xcode Cloud post-clone: reconstruct the Capacitor build inputs.
# The CocoaPods dev-pods reference ../../node_modules, so we must install JS
# deps, build the web app, cap-sync into iOS, and pod install before Xcode
# archives App.xcworkspace.
set -e

echo "▸ ci_post_clone starting in: $CI_PRIMARY_REPOSITORY_PATH"
cd "$CI_PRIMARY_REPOSITORY_PATH"

# Node is not preinstalled on Xcode Cloud runners; Homebrew is.
if ! command -v node >/dev/null 2>&1; then
  echo "▸ installing node via Homebrew"
  brew install node
fi
node -v && npm -v

echo "▸ npm ci"
npm ci

echo "▸ build web + cap sync ios"
npm run build
npx cap sync ios

echo "▸ pod install"
cd ios/App
pod install

echo "▸ ci_post_clone done"

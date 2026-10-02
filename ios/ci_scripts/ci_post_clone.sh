#!/bin/sh
set -e

# CocoaPods needs a UTF-8 locale; Xcode Cloud's shell doesn't always set one.
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Install Node.js LTS (v22) — avoid bleeding-edge versions that break npm.
# node@22 is keg-only, so put it on the PATH from wherever Homebrew lives
# (/opt/homebrew on Apple silicon runners, /usr/local on Intel).
echo "▸ Installing Node.js 22 LTS via Homebrew"
brew install node@22
NODE_PREFIX="$(brew --prefix node@22)"
export PATH="$NODE_PREFIX/bin:$PATH"

echo "▸ Node version: $(node --version)"
echo "▸ npm version: $(npm --version)"

# Xcode's own build phases (Expo configure, codegen, JS bundling) look for
# Node through ios/.xcode.env(.local); point them at this one.
echo "export NODE_BINARY=$NODE_PREFIX/bin/node" > "$CI_PRIMARY_REPOSITORY_PATH/ios/.xcode.env.local"

echo "▸ Installing Node.js dependencies"
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

# Make sure CocoaPods is present and current (some runner images ship an
# older one, or none).
if ! command -v pod >/dev/null 2>&1; then
  echo "▸ Installing CocoaPods"
  brew install cocoapods
fi
echo "▸ CocoaPods version: $(pod --version)"

echo "▸ Installing CocoaPods dependencies"
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod deintegrate || true
rm -rf Pods Podfile.lock
pod install --repo-update

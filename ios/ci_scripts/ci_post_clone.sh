#!/bin/sh
set -e

# Install Node.js LTS (v22) — avoid bleeding-edge versions that break npm
echo "▸ Installing Node.js 22 LTS via Homebrew"
brew install node@22
export PATH="/usr/local/opt/node@22/bin:$PATH"

echo "▸ Node version: $(node --version)"
echo "▸ npm version: $(npm --version)"

echo "▸ Installing Node.js dependencies"
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

echo "▸ Installing CocoaPods dependencies"
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod deintegrate || true
rm -rf Pods Podfile.lock
pod install --repo-update

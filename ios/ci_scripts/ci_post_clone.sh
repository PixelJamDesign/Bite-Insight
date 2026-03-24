#!/bin/sh
set -e

# Install Node.js (not pre-installed in Xcode Cloud)
echo "▸ Installing Node.js via Homebrew"
brew install node

echo "▸ Installing Node.js dependencies"
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

echo "▸ Installing CocoaPods dependencies"
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod deintegrate || true
rm -rf Pods Podfile.lock
pod install --repo-update

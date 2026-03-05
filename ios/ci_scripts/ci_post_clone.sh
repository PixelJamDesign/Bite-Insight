#!/bin/sh
set -e

# ── Install Node.js via nvm ─────────────────────────────────────────────────
export NVM_DIR="$HOME/.nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20

# ── Install JS dependencies ─────────────────────────────────────────────────
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci

# ── Install CocoaPods (with UTF-8 fix for Ruby 4.0) ─────────────────────────
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install

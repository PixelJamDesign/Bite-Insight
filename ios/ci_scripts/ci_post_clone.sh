#!/bin/zsh
set -euo pipefail

echo "──────────────────────────────────────────────"
echo "  Bite Insight — Xcode Cloud post-clone setup"
echo "──────────────────────────────────────────────"

# ── Node.js via nvm ──────────────────────────────────────────────────────────
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  echo "Installing nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
source "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
echo "Node $(node -v)  ·  npm $(npm -v)"

# ── Dependencies ─────────────────────────────────────────────────────────────
cd "$CI_PRIMARY_REPOSITORY_PATH"
echo "Installing npm dependencies..."
npm ci --loglevel verbose

# ── Purge any stale native packages that were previously removed ──────────
# @react-native-ml-kit/barcode-scanning was removed but may linger in CI cache
if [ -d "node_modules/@react-native-ml-kit" ]; then
  echo "⚠️  Removing stale @react-native-ml-kit from node_modules..."
  rm -rf "node_modules/@react-native-ml-kit"
fi

# ── Write .env from Xcode Cloud environment variables ────────────────────────
# Set these in Xcode Cloud → Workflow → Environment Variables:
#   EXPO_PUBLIC_SUPABASE_URL
#   EXPO_PUBLIC_SUPABASE_ANON_KEY
#   EXPO_PUBLIC_REVENUECAT_IOS_KEY
#   EXPO_PUBLIC_REVENUECAT_BILLING_KEY
#   (and any other EXPO_PUBLIC_* vars your app needs)
echo "Writing .env from Xcode Cloud environment variables..."
cat > "$CI_PRIMARY_REPOSITORY_PATH/.env" <<ENVEOF
EXPO_PUBLIC_SUPABASE_URL=${EXPO_PUBLIC_SUPABASE_URL:-}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}
EXPO_PUBLIC_REVENUECAT_BILLING_KEY=${EXPO_PUBLIC_REVENUECAT_BILLING_KEY:-}
EXPO_PUBLIC_REVENUECAT_IOS_KEY=${EXPO_PUBLIC_REVENUECAT_IOS_KEY:-}
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=${EXPO_PUBLIC_REVENUECAT_ANDROID_KEY:-}
ENVEOF
echo "  ✓ .env written"

# ── Expo prebuild (update native project from app config) ─────────────────────
# NOTE: Do NOT use --clean here. --clean deletes the entire ios/ directory
# (including this ci_scripts folder and the shared Xcode scheme), then
# regenerates it. If anything differs on the CI server, Xcode Cloud can't
# find the scheme and the build fails. Without --clean, prebuild updates
# the project in-place, preserving the committed scheme and ci_scripts.
cd "$CI_PRIMARY_REPOSITORY_PATH"
npx expo prebuild --platform ios --no-install
echo "  ✓ Expo prebuild complete"

# ── Homebrew + cmake (required by Hermes engine) ─────────────────────────────
if ! command -v cmake &>/dev/null; then
  echo "Installing cmake via Homebrew (this may take a few minutes)..."
  # Print a dot every 30s to keep Xcode Cloud's inactivity timer alive
  ( while true; do sleep 30; echo -n "."; done ) &
  KEEPALIVE_PID=$!
  brew install cmake
  kill $KEEPALIVE_PID 2>/dev/null || true
  echo ""
fi
echo "  ✓ cmake $(cmake --version | head -1)"

# ── CocoaPods (UTF-8 fix for Xcode Cloud) ───────────────────────────────────
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod cache clean --all 2>/dev/null || true

# Use --verbose to keep stdout active and prevent Xcode Cloud's
# 15-minute inactivity timeout from killing the build.
pod install --verbose
echo "  ✓ Pods installed"

echo "──────────────────────────────────────────────"
echo "  Post-clone complete ✓"
echo "──────────────────────────────────────────────"

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
npm ci

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

# ── Expo prebuild (regenerate native project from app config) ────────────────
cd "$CI_PRIMARY_REPOSITORY_PATH"
npx expo prebuild --platform ios --clean --no-install
echo "  ✓ Expo prebuild complete"

# ── CocoaPods (UTF-8 fix for Xcode Cloud) ───────────────────────────────────
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install
echo "  ✓ Pods installed"

echo "──────────────────────────────────────────────"
echo "  Post-clone complete ✓"
echo "──────────────────────────────────────────────"

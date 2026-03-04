#!/bin/zsh

# ─── Xcode Cloud post-clone script ─────────────────────────────────────────────
# Runs after Xcode Cloud clones the repo. Installs Node.js, project dependencies,
# and CocoaPods so the native iOS build can proceed.
# ────────────────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "▸ Starting ci_post_clone.sh"

# ─── 1. Install Node.js via nvm ────────────────────────────────────────────────
echo "▸ Installing Node.js..."
export NVM_DIR="$HOME/.nvm"

if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi

[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install 20
nvm use 20
node --version
npm --version

# ─── 2. Navigate to project root (one level up from ios/) ──────────────────────
cd "$CI_PRIMARY_REPOSITORY_PATH"
echo "▸ Working directory: $(pwd)"

# ─── 3. Install npm dependencies ───────────────────────────────────────────────
echo "▸ Installing npm dependencies..."
npm ci

# ─── 4. Set environment variables for Expo ──────────────────────────────────────
# Xcode Cloud environment variables are set in the Xcode Cloud workflow settings.
# Make sure the following are configured there:
#   EXPO_PUBLIC_SUPABASE_URL
#   EXPO_PUBLIC_SUPABASE_ANON_KEY
#   EXPO_PUBLIC_REVENUECAT_IOS_KEY
#   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
#   EXPO_PUBLIC_REVENUECAT_BILLING_KEY

# ─── 5. Install CocoaPods dependencies ─────────────────────────────────────────
echo "▸ Installing CocoaPods dependencies..."
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"

# Fix Ruby UTF-8 encoding issue
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

pod install --repo-update

echo "▸ ci_post_clone.sh completed successfully"

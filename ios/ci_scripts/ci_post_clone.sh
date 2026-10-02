#!/bin/sh
set -e

# CocoaPods needs a UTF-8 locale; Xcode Cloud's shell doesn't always set one.
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
# Don't let Homebrew update itself mid-build (slow, and pointless here).
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1

# Node.js 22 LTS from nodejs.org's prebuilt binaries rather than Homebrew:
# Homebrew no longer ships bottles for Intel Macs (which some Xcode Cloud
# images still are), so `brew install node@22` tries to compile everything
# from source and fails. The official tarball works on Intel and Apple
# silicon alike.
case "$(uname -m)" in
  arm64) NODE_ARCH=arm64 ;;
  *)     NODE_ARCH=x64 ;;
esac
NODE_DIST="https://nodejs.org/dist/latest-v22.x"
NODE_TARBALL="$(curl -fsSL "$NODE_DIST/SHASUMS256.txt" | awk "/darwin-$NODE_ARCH\\.tar\\.gz\$/ {print \$2}")"
NODE_SHA="$(curl -fsSL "$NODE_DIST/SHASUMS256.txt" | awk "/darwin-$NODE_ARCH\\.tar\\.gz\$/ {print \$1}")"
echo "▸ Installing $NODE_TARBALL"
curl -fsSL "$NODE_DIST/$NODE_TARBALL" -o /tmp/node.tar.gz
echo "$NODE_SHA  /tmp/node.tar.gz" | shasum -a 256 -c -
NODE_HOME="$HOME/node22"
mkdir -p "$NODE_HOME"
tar -xzf /tmp/node.tar.gz -C "$NODE_HOME" --strip-components 1
export PATH="$NODE_HOME/bin:$PATH"

echo "▸ Node version: $(node --version)"
echo "▸ npm version: $(npm --version)"

# Xcode's own build phases (Expo configure, codegen, JS bundling) look for
# Node through ios/.xcode.env(.local); point them at this one.
echo "export NODE_BINARY=$NODE_HOME/bin/node" > "$CI_PRIMARY_REPOSITORY_PATH/ios/.xcode.env.local"

echo "▸ Installing Node.js dependencies"
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

# CocoaPods ships on the Xcode Cloud images; install it only if missing.
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

#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
mobile_dir="${FAMILYTABLE_MOBILE_DIR:-$repo_dir/mobile}"
export JAVA_HOME="${JAVA_HOME:-/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export EXPO_PUBLIC_DEMO=false
export EXPO_PUBLIC_EMAIL_ENABLED=false
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://api-development-62d4.up.railway.app}"
export EXPO_PUBLIC_AUTH_URL="${EXPO_PUBLIC_AUTH_URL:-https://keycloak-development-eb7c.up.railway.app/realms/familytable}"
cd "$mobile_dir/android"
./gradlew assemblePreview -PreactNativeArchitectures=arm64-v8a --max-workers=2 --no-daemon --console=plain
mkdir -p "$repo_dir/mobile/artifacts"
cp app/build/outputs/apk/preview/app-preview.apk "$repo_dir/mobile/artifacts/family-table-preview.apk"

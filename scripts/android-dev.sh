#!/bin/sh
set -eu
REPO_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
MOBILE_DIR=${FAMILYTABLE_MOBILE_DIR:-"$REPO_DIR/mobile"}
export ANDROID_HOME=${ANDROID_HOME:-"$HOME/Library/Android/sdk"}
export JAVA_HOME=${JAVA_HOME:-"$(/usr/libexec/java_home -v 17)"}
export EXPO_PUBLIC_DEMO=false EXPO_PUBLIC_EMAIL_ENABLED=false
export EXPO_PUBLIC_API_URL=https://api-development-62d4.up.railway.app
export EXPO_PUBLIC_AUTH_URL=https://keycloak-development-eb7c.up.railway.app/realms/familytable
export EXPO_NO_TELEMETRY=1
export PATH="$ANDROID_HOME/platform-tools:$PATH"
cd "$MOBILE_DIR"
if [ ! -d android ]; then node node_modules/expo/bin/cli prebuild --platform android --no-install; fi
# Android Studio's Java 25 causes Prefab native build errors with this SDK.
printf '%s\n' 'toolchainVersion=17' > android/gradle/gradle-daemon-jvm.properties
(cd android && ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a --max-workers=2 --console=plain)
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:8082 tcp:8082
node node_modules/expo/bin/cli start --dev-client --localhost --port 8082

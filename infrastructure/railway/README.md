# Railway development deployment

Project: https://railway.com/project/769cf573-cb1d-4e70-94c4-5a8488b60bed
Environment: development (`d0dffb75-af81-40b0-9c9c-cf973fe5e8e7`).

Services: `api`, `keycloak`, and private `postgres`. PostgreSQL has a persistent volume at `/var/lib/postgresql`; the initial database script creates a separate Keycloak database. Railway stores generated database and administrator passwords as service variables. No secrets are included in this repository.

- API: https://api-development-62d4.up.railway.app
- Keycloak: https://keycloak-development-eb7c.up.railway.app
- Realm: `familytable`; mobile client: `familytable-mobile`; API audience: `familytable-api`.

The API Docker container initializes the fresh database schema before starting. This is appropriate for the initial development deployment; use versioned EF migrations for subsequent schema changes.

Deploy from the repository root with the Railway CLI:

```sh
railway up --project 769cf573-cb1d-4e70-94c4-5a8488b60bed --environment development --service api --detach
railway up --project 769cf573-cb1d-4e70-94c4-5a8488b60bed --environment development --service keycloak --detach
```

Each service selects its Dockerfile through `RAILWAY_DOCKERFILE_PATH`. These are local source uploads, not GitHub autodeploys.

Instacart ordering needs `Instacart__ApiKey` on the `api` service (Railway → api → Variables). Development keys work with the default `Instacart__BaseUrl` (`https://connect.dev.instacart.tools`); switch it to `https://connect.instacart.com` with a production key. Optionally set `Instacart__LinkbackUrl` to the web app's URL.

Email is deferred: `Smtp__Enabled=false` returns a clear 503 for invitations. Account registration currently does not require email verification; email-bound invitations still require a verified address. Use family codes and owner approval to join. When configuring SMTP, set API SMTP variables and Keycloak realm SMTP settings, enable verification, and set `EXPO_PUBLIC_EMAIL_ENABLED=true` in the development server environment. Realm imports do not overwrite existing realms; change existing settings through the Keycloak admin API or console.

For Android, install dependencies in `mobile`, open the generated `mobile/android` folder in Android Studio, and run `scripts/android-dev.sh`. The script builds an ARM64 debug APK with Expo Dev Client using JDK 17, installs it through ADB, and forwards Metro on port 8082 over USB. Approve the phone's USB debugging prompt. For this machine's temporary runtime, set `FAMILYTABLE_MOBILE_DIR=/tmp/familytable-runtime`.


## Untethered Android preview

Run `scripts/android-preview.sh` to build an ARM64 preview APK with embedded JavaScript, fonts, and assets. It connects to Railway over the phone's internet connection and does not need Metro, USB, or this computer. On this machine use `FAMILYTABLE_MOBILE_DIR=/tmp/familytable-runtime GRADLE_USER_HOME=/tmp/familytable-gradle scripts/android-preview.sh`.

In Android Studio open `mobile/android`, select the `preview` variant in Build Variants, and build an APK. Supply the four `EXPO_PUBLIC_*` values from the script when starting Android Studio so Expo embeds the Railway endpoints. The script is the reproducible equivalent using the same Gradle project and installed SDK.

Output: `mobile/artifacts/family-table-preview.apk`. Share this file with testers. They can install it on an ARM64 Android phone (Android 7 or later), allowing installation from the chosen file-sharing app when Android prompts. Internet is required for sign-in and family data. The preview uses the existing debug signing key so it can update the installed development app while preserving app data. This key is for testing; use a private release signing key before publishing to a store. Future APK updates must retain the same signing key.

The `familytable` login theme extends Keycloak's built-in theme and preserves its sign-in, registration, validation, and accessibility behavior. It bundles licensed Bubblegum Sans/Nunito fonts and the app's original strawberry artwork. Docker copies it from `infrastructure/keycloak/themes`; the realm's `loginTheme` is `familytable`. Existing realms need that setting applied once through the admin API or console.

Registration collects username, email, and password; first and last name attributes are removed from the realm user profile. The API uses `preferred_username` when adding family members. The profile configuration is included in both realm imports for fresh environments. Existing realm profiles are updated through `/admin/realms/familytable/users/profile`.

Signing keys are excluded from Git. After a fresh clone, create a local debug key before building Android (use the existing local key when updating an installed preview):

```sh
keytool -genkeypair -keystore mobile/android/app/debug.keystore -storepass android -alias androiddebugkey -keypass android -dname "CN=Android Debug,O=Android,C=US" -keyalg RSA -keysize 2048 -validity 10000
```

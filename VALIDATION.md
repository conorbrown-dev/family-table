# Validation — October 8, 2026

## Passed

- .NET 10 solution built with zero warnings and zero errors (Domain, Application, Infrastructure, API).
- 10 backend tests passed: member writes remain pending; owners approve; members cannot approve themselves; outsiders cannot read or write; stale revisions are rejected; stale approvals cannot overwrite owner changes; declined requests retain original data; quantities scale with servings and keep distinct units; archiving preserves records; invalid ratings/units are rejected; member views hide owner-only codes and other people’s requests.
- Four mobile logic tests passed: approval gating, stale-request protection, scaled recipe totals, and HTML escaping/section selection for printable sheets.
- TypeScript validation passed for the mobile application and generated API client.
- OpenAPI client generated from the running .NET API and checked into `mobile/src/generated`.
- Public health endpoint returned `ready`; an unauthenticated request to `/api/families` returned HTTP 401.
- Local Postgres schema initialized successfully using EF Core.
- Keycloak realm imported and started successfully after bundling the realm in its image.
- 18 live integration checks passed with temporary Keycloak accounts: authenticated API writes, Postgres family queries, outsider rejection, code-join approval, hidden member join codes, member requests/owner approvals, stale-write rejection, recipe steps/ratings, scaled plan totals, grocery checks, archive/restore, captured SMTP invitation, verified-email acceptance, single-use tokens, and second-owner assignment. Disposable users, the temporary grant client, and the test family were removed afterward.
- Bundled catalog contains 7,793 official USDA SR Legacy food entries before common-item merging/deduplication.
- Browser preview checked at desktop width and 390×844 phone width. The member request/owner approval flow was exercised: Oliver added an ingredient; it stayed out of the catalog until Alex approved it.
- A meal plan generated and saved a grocery list with combined amounts. The print sheet displayed grocery, ingredient, meal-plan, combined and separate-sheet choices.

## Not yet verified

- Mobile authorization-code/PKCE sign-in was configured but not exercised on a native device. The live API integration tests used a temporary Keycloak password-grant client, which was removed; password grant remains disabled for the actual mobile client.
- iOS/Android device builds and native PDF share/print dialogs were not exercised. Native PDF generation uses Expo Print; browser PDF saving uses the browser print dialog.
- The initial Keycloak realm bind mount failed with macOS “Resource deadlock avoided.” The project now bundles that realm file in a Docker image, and startup was verified.
- The workspace exhibited blocked/slow reads for some newly installed package files. A clean temporary runtime at `/tmp/familytable-runtime` was used for the browser preview. Its source was synchronized with the workspace; the canonical implementation remains in this repository. A normal fresh `npm ci` recreates dependencies for other environments.

## Dependency audit

The initial mobile audit reported **27 advisories: 10 moderate and 17 high**. These include transitive Expo/React Native development tooling, `node-forge`, `braces`, old `uuid`, and PostCSS selector parsing dependencies. Several suggested automatic “fixes” downgrade Expo to SDK 44 or change Tailwind/NativeWind to unsupported major versions. No forced downgrade was applied. Treat this as a release blocker until compatible upstream versions or reviewed overrides resolve the relevant advisories. The lockfile records the installed dependency tree.

The backend initially exposed a vulnerable transitive Microsoft.OpenApi 2.0.0 dependency. It was replaced by an explicit Microsoft.OpenApi 2.7.5 reference, and the backend restored and built cleanly afterward.

## Local services

The demo browser preview is at http://localhost:8081 and the API at http://localhost:5080. Local Docker volumes retain the development database. To stop the project’s services when finished, run `docker compose down` (without `-v` to preserve data). Development SMTP is captured by Mailpit, not delivered externally.

See README.md for startup instructions and production limitations.

## Storybook styling refresh

Bundled Bubblegum Sans headings and Nunito body/input fonts with Expo Font. Updated the shared theme and all screens, adding an original strawberry, bow, cloud, and rainbow mascot. TypeScript checks passed; the 390 × 844 browser phone preview and recipe form were visually checked. Screenshot: `mobile/docs/screenshots/storybook-phone.jpg`. Native device rendering remains unverified.

## Railway and Android development deployment

Railway project `769cf573-cb1d-4e70-94c4-5a8488b60bed` (development) has running API, Keycloak, and persistent PostgreSQL services. API: https://api-development-62d4.up.railway.app. Keycloak: https://keycloak-development-eb7c.up.railway.app. Seventeen cloud integration checks passed. Disposable test accounts, client, and family were removed; the user-approved temporary cleanup SSH key was revoked. Email is deferred. API health returns ready; unauthenticated family access returns 401.

Android development build succeeded with JDK 17 and ARM64 native libraries. The APK was installed on the USB-authorized Pixel 9 Pro XL and launched against Metro on port 8082, configured for Railway. Android Studio is streaming the device. Native welcome screen and deployed Keycloak sign-in/registration page were verified. A NativeWind/Pressable callback-style rendering issue was fixed by using a static button style. TypeScript and four app logic tests passed. Native authenticated workflows and PDF export still require device testing after account sign-in. APK: `mobile/artifacts/family-table-development.apk`. See `infrastructure/railway/README.md` and `scripts/android-dev.sh`.


## Styled authentication and untethered preview

Keycloak login theme `familytable` is deployed and selected on the Railway realm. Sign-in and registration were visually checked with the app's original strawberry artwork, Bubblegum Sans/Nunito fonts, pastel background, rounded inputs, and pink buttons. CSS filenames include a content hash to avoid stale browser caches. Authentication templates remain inherited from Keycloak.

Removed single-line JSX spaces under native containers in App, Family, and Ingredients, which caused the reported Text component errors. RequestPreview numeric conditions now return booleans; its remaining labels use standard app copy. Added a source regression check for raw JSX text outside Text. TypeScript validation, that check, and four app logic tests pass.

`assemblePreview` succeeded using Android Studio's installed SDK, JDK 17, and the native Gradle project. Signed ARM64 APK `mobile/artifacts/family-table-preview.apk` is 32.9 MiB. Embedded Hermes JavaScript and 17 bundled font assets were verified. Installed on the Pixel 9 Pro XL as `1.0.0-preview`, preserving its session. Metro was stopped, USB reverse mappings were absent, and the signed-in family setup screen rendered successfully after a fresh launch. No native errors appeared in the launch log check. The app connects to Railway over internet; it requires no USB or computer. Native PDF export and authenticated family CRUD still need testing with actual family data. Rebuild with `scripts/android-preview.sh`.


## Username identity

Removed firstName and lastName from the live Keycloak user profile and both realm import configurations. Verified registration displays only username, password/confirmation, and email. The API now uses preferred_username for newly added family members. Backend build succeeded with zero warnings/errors. No mobile rebuild is required: registration is hosted and member names come from the API.


## Web app and custom domain (2026-11-14)

Added `/web` with an Expo web entry point sharing mobile screens, forms, API client, and business logic. Browser authentication uses a dedicated `familytable-web` public Keycloak client, authorization code with S256 PKCE, exact production/local callback origins, session storage, token renewal, and end-session sign-out. Both realm imports include the browser client. No first/last name fields were added.

Railway `web` service `8b7937eb-5652-40b9-9d31-5fd78ccfdda4` follows `codex/web-app` in `conorbrown-dev/family-table` and builds `web/Dockerfile` from the repo root. Successful deployment: `6d52e9fa-7ff2-4a7f-aae2-c411dea93656`. The container uses the same API and migrated Keycloak service URLs as mobile, and no database credentials. Cloudflare CNAME/TXT records were created; Railway verified `familytable.orangecastle.net` and issued its HTTPS certificate.

Validation: production export and TypeScript checks pass; four shared app logic tests and the native raw-text regression check pass. The web server test covers SPA callbacks, health, immutable assets, missing assets/private files, and unsupported methods. Live `/health` returns ready, `/callback` serves the SPA (200), `/.env` returns 404, and API preflight allows only the configured web origin (an unrelated origin receives no allow-origin header). Live sign-in reaches the themed Keycloak page with the correct web client, HTTPS callback, state, and S256 challenge. Signed-in callback/data loading awaits the user's existing-account check; a temporary test account was not created.

Browser demo validation: desktop dashboard renders the same pastel design; saving a recipe with optional multiline instructions works; PDF selection exposes combined/separate sheets; clicking print invoked a blocking browser print flow that could not be inspected through the in-app browser automation. At 390px wide the app has no horizontal overflow and uses the phone navigation layout. Saved screenshot proof is under `web/docs`. Production demo mode is false; production builds clear the Metro cache to prevent development environment flags being reused. Shared font imports now bundle only the four fonts actually used.


## Dialog drafts and installable web app (2026-11-14)

The live existing-account check completed: the authenticated web app loaded the user's family with 63 recipes and two members, recipe details opened, and a page refresh retained sign-in. No production family data was changed during verification.

Shared editors now retain unsaved fields when closed, scoped by user, family, record, and the source meal plan for generated grocery lists. Clear resets editable fields without changing saved records; successful saves/approval submissions complete drafts. Print selections are retained and can be cleared. Drafts are in memory for the current app session; reload/restart ends that session. Closing an editor is disabled while it submits, to prevent a completed save from closing another draft.

Browser demo checks passed for recipe text, ingredient quantities and multiline instructions after close/reopen; grocery rows and Clear/reopen; independent recipe/list drafts; successful-save cleanup; meal dates/servings and Clear; retained print section/layout choices and Clear; appending a meal to an unfinished plan; and generated grocery-list drafts. TypeScript, the native JSX text regression check, four shared logic tests, and three web tests pass.

The web build now includes standalone install metadata, 192/512px maskable strawberry icons, an Apple touch icon, and a service worker. The worker caches only a public offline page, install icons, and the manifest. Tests verify that API/auth requests, writes, callback query strings, and authenticated documents are not cached; offline navigation gets the connection-required page; upgrades leave unrelated caches intact and wait for open windows to close. The production server returns the manifest MIME type and revalidates the manifest/worker. No automatic reload interrupts an open form.

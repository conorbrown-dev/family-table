# Family Table web

Browser app at https://familytable.orangecastle.net, deployed as the `web` service in the existing Railway `family-table` project and `development` environment.

The web entry point imports the same responsive React components, forms, generated API client, and business logic as the mobile app. Metro replaces only the authentication module and stylesheet with web adapters. It uses the existing API and PostgreSQL data; family roles and write approvals are enforced by that API.

## Develop and build

```sh
cd web
npm ci
cp .env.example .env
npm start
```

Open http://localhost:8083. The dedicated Keycloak public client `familytable-web` permits that local origin and the production domain. Authentication uses authorization code with S256 PKCE, exact `/callback` URLs, and tokens stored in session storage. Refresh preserves the browser session within that tab; sign-out also ends the Keycloak session. Email invitations remain deferred.

```sh
npm run typecheck
npm test
npm run build
npm run serve
```

`npm run serve` hosts the compiled app at port 8080 (or `$PORT`). Browser printing offers the browser's print/save-as-PDF dialog with combined or separate sections. The backend remains responsible for ingredient totals and family data validation through the shared client/logic.

## Railway

Build from the repository root using `web/Dockerfile`; the Docker context must include `mobile/App.tsx`, `mobile/src`, `mobile/global.css`, and `mobile/tailwind.config.js`. The final image is an unprivileged Node static server, with embedded web assets and `/health` for deployment checks. `/callback` and app routes fall back to the SPA; missing assets return 404.

Set build variables `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_AUTH_URL` to the existing Railway API and Keycloak realm URLs. Docker sets `EXPO_PUBLIC_DEMO=false` and `EXPO_PUBLIC_EMAIL_ENABLED=false`. These are public client settings, never credentials. Changes require a new build.

Allow `https://familytable.orangecastle.net` in the API's `Cors:Origins`. Both realm import files contain the dedicated `familytable-web` client for fresh environments; existing realms are updated through the Keycloak Admin API. Do not replace the existing mobile client or database connection.

Cloudflare DNS routes `familytable.orangecastle.net` to the Railway custom-domain CNAME target, with the `_railway-verify.familytable` TXT ownership record. Railway issues the HTTPS certificate.

# Family Table

A pastel, responsive Expo app for a family’s ingredients, recipes, grocery lists, and meal plans, with a .NET 10 API and self-hosted Keycloak sign-in.

## Try the app

Requires Node 22.13+ (Node 24 LTS recommended), .NET 10 SDK, and Docker Desktop for connected mode. iOS builds need Xcode; Android builds need Android Studio.

```sh
cd mobile
npm ci --legacy-peer-deps
npm run web
```

Open http://localhost:8081. The default **Demo kitchen** uses sample family data stored on this device. In the Family screen, “Try as Oliver” (or another child) lets you request a change. Switch back to Alex or Jamie to review and approve it. Demo emails and joining another family are clearly labeled previews; they do not contact anybody.

The same React Native screens adapt to a phone with bottom navigation, and to a browser with a sidebar. Use `npm run ios` or `npm run android` for a native development build. This project targets Expo SDK 57; use a development build rather than assuming the installed Expo Go version supports it.

## Connect a real family

```sh
docker compose up -d --build
dotnet restore
dotnet run --project backend/src/FamilyTable.Api -- --initialize
dotnet run --project backend/src/FamilyTable.Api --urls http://localhost:5080
```

`--initialize` creates the initial database schema once. It is intended for a new development database, not production schema upgrades. Postgres data persists in Docker volumes.

In another terminal:

```sh
cd mobile
cp .env.example .env
# Set EXPO_PUBLIC_DEMO=false in .env
npm run web
```

Keycloak: http://localhost:8080, development admin `admin` / `local-admin-only`. Development email inbox: http://localhost:8025. Sign up through the app and verify your email using that inbox. Create your family, invite your partner, and make them an owner from the Family screen. Invited people are members by default. Children can join by invitation or code. Code joins require approval before receiving family access; an owner’s email invitation already grants membership on acceptance.

Invitations contain a single-use token bound to the recipient’s verified email and expire after seven days. Paste the token into the app’s Email invitation field. Tokens are hashed in Postgres. Family codes use 64 bits of cryptographic randomness, are visible only to owners, and can be rotated. Joining does not assign ownership.

For a physical phone, replace localhost URLs with your development machine’s reachable address, configure the API’s JWT authority to the same Keycloak issuer, update Keycloak redirect URLs/web origins, and deliberately expose development ports to your local network. Production requires HTTPS and exact registered redirect URLs.

## What works

- Add, edit, view, archive, and restore ingredients, recipes, grocery lists, and meal plans.
- Optional recipe steps can be added, edited, or removed; ratings are 1–5 stars per person.
- Meal entries carry a date, meal slot, recipe, and serving count.
- Generate a grocery list from a plan, scaling each recipe by its planned servings.
- Check off groceries; group ingredients by aisle and search the catalog.
- Every family member write, including ratings and checkboxes, becomes a request. Owners approve or decline it. The server enforces this independently of the interface.
- Optimistic revision checks prevent concurrent writes from silently replacing each other. Approval fingerprints reject requests if their target changed after submission.
- Print grocery lists, all needed meal-plan ingredients, and meal plans together or with page breaks. Native devices create and share a PDF; browsers use the print dialog’s “Save as PDF.” Large lists may span multiple pages rather than shrinking to unreadable text.
- Multiple families, multiple owners, role changes, code rotation, and last-owner protection.
- Order a grocery list on Instacart: unchecked items become an Instacart shopping list page, where the user picks a store, adds the items to their cart, and checks out. See [Instacart](#instacart).

Quantities aggregate only when ingredient and unit match. Cups, ounces, packages, and jars remain separate: mass/volume conversions need ingredient density, and package sizes vary. Units include each, cups, fluid ounces, ounces, pounds, teaspoons, tablespoons, pints, quarts, gallons, grams, kilograms, milliliters, liters, packages, jars, jugs, boxes, containers, cans, bags, bunches, slices, and cloves.

## Instacart

"Order on Instacart" on a grocery list calls `POST /api/families/{id}/groceries/{listId}/instacart`. The API sends the list's unchecked items to Instacart Developer Platform's [Create shopping list page](https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page) endpoint and returns the page link; the app opens it (the Instacart app on phones when installed, a new tab on the web). Instacart offers no API that fills a user's cart directly, so the user confirms the store and adds the items there before checking out.

- Configuration (API service): `Instacart__ApiKey` (required; without it the endpoint returns 503), `Instacart__BaseUrl` (defaults to the development server `https://connect.dev.instacart.tools`; use `https://connect.instacart.com` with a production key), and optional `Instacart__LinkbackUrl` (shown on Instacart's page as a link back to Family Table). Keep the key on the API only.
- Same ingredient and unit are combined. Units convert to Instacart's names (tbsp → tablespoon, lb → pound, fl oz → cups). Units Instacart doesn't have (jar, jug, box, container, bag, slice, clove) are sent as whole packages or items, with the original amount in the item's label, e.g. "Pickled jalapeños (0.25 jar)".
- Each tap creates a new Instacart page. Getting a production key requires Instacart's approval and following its developer and branding guidelines.

## Ingredient catalog

New connected families receive the bundled **7,793 USDA SR Legacy foods** plus common kitchen ingredients, deduplicated by name. The demo intentionally uses a smaller everyday catalog. USDA contains food entries (including prepared foods), not a definitive inventory of every US ingredient or branded product. Custom ingredients are supported.

Source: [USDA FoodData Central downloads](https://fdc.nal.usda.gov/download-datasets/), SR Legacy April 2018. Stable USDA-derived UUIDs preserve identity when rebuilding the catalog. The source dataset is public-domain US government data. To replace the bundled catalog with another official JSON ZIP:

```sh
python3 scripts/import_usda.py /path/to/FoodData_Central_food_json.zip
```

This affects newly created families; existing families keep their catalog and edits.

## Structure

```text
backend/src/FamilyTable.Domain          Family aggregate, records, units, invariants
backend/src/FamilyTable.Application     CQRS requests, MediatR handlers, repository ports
backend/src/FamilyTable.Infrastructure  EF Core/Postgres persistence and bundled catalog
backend/src/FamilyTable.Api             JWT, OpenAPI, SMTP, HTTP composition
backend/tests/FamilyTable.Tests         Permission, approval, conflict, calculation tests
mobile/src/components                  Shared controls, editors, recipe and print sheets
mobile/src/screens                     Overview, Recipes, Plans, Groceries, Ingredients, Family
mobile/src/lib                         Auth, state contracts, demo rules, totals and print HTML
mobile/src/generated                   Checked-in OpenAPI-generated method-style API client
infrastructure                         Keycloak image and realm configuration
```

Families are persisted as a Postgres JSONB aggregate with a concurrency revision and unique join-code index. This keeps approval application atomic and all reads/writes scoped to a family. Large deployments should split catalog/read projections from family snapshots, add pagination on the API, and use EF migrations for versioned schema upgrades. Archived records remain available to historical recipes and plans.

Auth uses authorization code + PKCE with Keycloak, audience-validated JWTs on the API, native SecureStore for sessions, and refresh tokens. Browser tokens stay in memory. The API trusts the JWT subject, never a client-supplied actor or role. No demo authentication bypass exists on the server.

To regenerate the client, run the API and then:

```sh
cd mobile
npm run generate-client
```

[ASP.NET Core OpenAPI documentation](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/aspnetcore-openapi?view=aspnetcore-10.0) describes the generated contract.

## Checks

```sh
dotnet build
dotnet test backend/tests/FamilyTable.Tests
# With API and compose services running:
python3 scripts/integration_test.py
cd mobile
npm run typecheck
npm test
npx expo install --check
```

See [VALIDATION.md](VALIDATION.md) for the actual checks performed and remaining limitations.

## Before production

This is an initial working implementation, not a deployed production service. Replace the development database/admin secrets, run Keycloak in production mode behind HTTPS, restrict CORS and redirects, configure a real SMTP provider, and add backups, EF migrations, rate limits for sign-in/join/invite endpoints, an email outbox with retries, audit/retention policies, and device end-to-end tests. Owner/member changes and data modifications are server-authorized; invitation delivery currently uses synchronous SMTP. A concurrent family edit during invitation creation can require retrying delivery.

MediatR 14 is under its current commercial/community license terms; review eligibility and configure its license key if your deployment requires one. The current mobile dependency audit has unresolved advisories, including Expo/Tailwind transitive tooling. They must be reviewed before release; blindly applying `npm audit fix --force` would downgrade Expo or change unsupported major versions. See VALIDATION.md.

Recipe-card photos in the sample interface load from Unsplash; text and editing work independently of those remote images. Custom recipe-photo uploads and app-store publishing are not included.

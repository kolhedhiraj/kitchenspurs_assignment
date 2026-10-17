# Analytics SDK & Dashboard

A small analytics system for collecting browser and server events, storing them in PostgreSQL, and reporting activity through a date-filtered dashboard. A Next.js restaurant demo generates browser events and creates real orders through Laravel.

## Overview

The repository contains a framework-independent TypeScript browser SDK, Laravel 12 API, Next.js restaurant demo, and Next.js analytics dashboard. Laravel validates events, derives source and receipt time, and persists them idempotently. Dashboard metrics query persisted events. Restaurant orders and items commit before a best-effort order_created request.

## Features

- Initial and route-change page views, plus menu/cart/checkout events.
- Persisted anonymous browser UUID, optional user ID, timeout, and bounded SDK retry.
- Separate browser/server ingestion credentials; Laravel derives event source.
- PostgreSQL JSONB properties/context, unique event IDs, validation, payload limits, and rate limits.
- Server-authoritative menu prices and transactional order/item persistence.
- Date-filtered page views, unique visitors, popular pages, event counts/trends, daily traffic, and recent event summaries.
- Deterministic demo events covering 30 UTC days.

## Architecture

~~~mermaid
flowchart LR
  R[Restaurant Next.js app] --> SDK[Browser analytics SDK]
  SDK -->|POST /api/v1/events| API[Laravel API]
  R -->|GET menu / POST order| API
  API -->|commit order and items| DB[(PostgreSQL)]
  API -->|server-key order_created request| API
  API -->|persist event| DB
  D[Dashboard Next.js app] -->|GET analytics overview| API
  API -->|SQL aggregates| DB
~~~

Processing is synchronous; there is no queue or durable outbox. Stored event times and report grouping use UTC; report dates are inclusive UTC calendar days.

## Technology stack

| Component | Technology | Purpose |
| --- | --- | --- |
| API | Laravel 12, PHP 8.3+ | Ingestion, database-backed menu/orders, analytics aggregates |
| Database | PostgreSQL 16 (postgres:16-alpine) | Events, menu items, orders, order items |
| Restaurant | Next.js 16, React 19, TypeScript | Customer demo and SDK integration |
| Dashboard | Next.js 16, React 19, TypeScript | Date-filtered analytics UI |
| SDK | TypeScript npm workspace | Browser identity, event envelope, delivery |
| Local infrastructure | Docker Compose | PostgreSQL and Laravel API |

Root npm and API Composer lockfiles are present. The SDK is private to this workspace and is not published to npm.

## Project structure

~~~text
apps/api/                 Laravel actions, routes, models, migrations, seeder, tests
apps/dashboard/           Next.js analytics dashboard and tests
apps/restaurant/          Next.js demo, cart/checkout, SDK wiring and tests
packages/browser-sdk/     Framework-independent SDK and tests
docker/api.Dockerfile     PHP 8.3 CLI image
docker-compose.yml        PostgreSQL and API services
docs/                     Architecture, API, schema, decisions, limitations
package.json              npm workspace commands
~~~

## Prerequisites

Compose setup: Docker Desktop or another working Docker Engine with Compose plugin, Node.js 20.9+ and npm.

Host API alternative: PHP 8.3+, Composer 2, pdo_pgsql, SQLite support for tests, and PostgreSQL reachable on the host. The Dockerfile installs PostgreSQL and SQLite PHP extensions. Redis, a queue worker, and other services are not used.

## Environment configuration

Copy examples without overwriting existing local files:

~~~sh
[ -f apps/api/.env ] || cp apps/api/.env.example apps/api/.env
[ -f apps/restaurant/.env.local ] || cp apps/restaurant/.env.example apps/restaurant/.env.local
[ -f apps/dashboard/.env.local ] || cp apps/dashboard/.env.example apps/dashboard/.env.local
~~~

| Variable | Purpose |
| --- | --- |
| API APP_KEY | Laravel key; generate locally if blank. |
| API DB_CONNECTION, DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD | PostgreSQL connection. Compose API uses db:5432. |
| API ANALYTICS_APPLICATION_ID | The single app ID accepted by this demo. |
| API BROWSER_INGESTION_KEY | Public browser key sent in X-Analytics-Key; not a secret. |
| API SERVER_INGESTION_KEY | Server-only key; never expose to browser code. |
| API ANALYTICS_API_URL | Event endpoint used by Laravel server tracking. |
| API CORS_ALLOWED_ORIGINS | Comma-separated allowed frontend origins. |
| API MENU_MANAGEMENT_KEY | Server-only random key required for menu management; entered in the dashboard and never bundled into frontend code. |
| Frontends NEXT_PUBLIC_API_URL | Browser-accessible API base, normally http://localhost:8000. |
| Restaurant NEXT_PUBLIC_ANALYTICS_API_KEY | Public browser ingestion key. |
| Restaurant NEXT_PUBLIC_ANALYTICS_APPLICATION_ID | Application ID included in SDK events. |

The .env.example files contain local development defaults. Set `MENU_MANAGEMENT_KEY` in `apps/api/.env` to a random secret of at least 32 characters; menu management remains disabled if it is missing or too short. Change local credentials for shared environments and set APP_DEBUG=false outside local development. Never commit .env/.env.local, database credentials, the menu key, or SERVER_INGESTION_KEY; only the browser analytics key is intentionally exposed to browser code.

## Local setup

From the repository root:

~~~sh
npm ci
[ -f apps/api/.env ] || cp apps/api/.env.example apps/api/.env
[ -f apps/restaurant/.env.local ] || cp apps/restaurant/.env.example apps/restaurant/.env.local
[ -f apps/dashboard/.env.local ] || cp apps/dashboard/.env.example apps/dashboard/.env.local
docker compose up -d --build
grep -q '^APP_KEY=.' apps/api/.env || docker compose exec api php artisan key:generate
docker compose exec api php artisan optimize:clear
docker compose exec api php artisan storage:link
docker compose exec api php artisan migrate --seed
~~~

Run each Next app in a separate terminal from the repository root:

~~~sh
npm run dev:restaurant
~~~

~~~sh
npm run dev:dashboard
~~~

The npm scripts build the SDK before starting Next.js. Compose runs db (PostgreSQL) and api (Laravel); the Next apps run on the host.

- Restaurant: http://localhost:3000
- Dashboard: http://localhost:3001
- Laravel health: http://localhost:8000/up
- API base: http://localhost:8000/api/v1

### Run Laravel on the host instead

This alternative assumes PostgreSQL is running and reachable through the host port. Set DB_HOST=127.0.0.1 in apps/api/.env; db resolves only inside Compose.

~~~sh
cd apps/api
composer install --no-interaction
grep -q '^APP_KEY=.' .env || php artisan key:generate
php artisan migrate --seed
PHP_CLI_SERVER_WORKERS=4 php artisan serve --host=127.0.0.1 --port=8000
~~~

Multiple PHP development-server workers are needed because order creation calls the event endpoint on the same API after commit. Compose configures workers. Start both npm apps in other terminals.

## Database setup

Compose uses postgres:16-alpine as service db, publishes port 5432, and stores data in named volume postgres_data. The API container uses DB_HOST=db; host-run Laravel uses 127.0.0.1.

~~~sh
docker compose exec api php artisan migrate --seed
docker compose exec api php artisan migrate:status
~~~

These commands do not drop tables or volumes. The seeder uses deterministic IDs and updateOrCreate, so reseeding refreshes its demo rows. Events use UUID uniqueness, timezone-aware timestamps, JSONB, and reporting indexes. Order items reference orders. PHPUnit uses in-memory SQLite; that does not verify PostgreSQL migrations/connectivity.

## API

Base URL: http://localhost:8000/api/v1; health is /up. CORS permits configured frontend origins. Laravel JSON validation errors return HTTP 422.

| Method/path | Purpose | Authentication/limit |
| --- | --- | --- |
| GET /up | Health/status | None |
| GET /api/v1/menu | Database-backed menu, availability and image URLs | None |
| GET /api/v1/admin/menu-items | List menu items and categories | X-Menu-Management-Key |
| GET /api/v1/admin/menu-items/{id} | Retrieve one menu item | X-Menu-Management-Key |
| POST /api/v1/admin/menu-items | Create an item and upload its image | X-Menu-Management-Key; 30/minute |
| PATCH /api/v1/admin/menu-items/{id} | Update item fields and optionally replace its image | X-Menu-Management-Key; 30/minute |
| PATCH /api/v1/admin/menu-items/{id}/availability | Change customer availability | X-Menu-Management-Key; 60/minute |
| DELETE /api/v1/admin/menu-items/{id} | Soft-delete an item while keeping historical order snapshots | X-Menu-Management-Key; 30/minute |
| POST /api/v1/orders | Validate available database items, calculate database prices, persist snapshots, attempt order_created | Demo endpoint; 30/minute |
| GET /api/v1/orders, GET /api/v1/orders/{id} | List latest 100 orders or retrieve an order and its items/status | Unauthenticated demo |
| PATCH /api/v1/orders/{id}/status | Validate and persist an allowed order transition, then attempt its business event | Unauthenticated demo; 60/minute |
| POST /api/v1/events | Persist one event idempotently | X-Analytics-Key; 120/minute |
| GET /api/v1/analytics/overview?from=YYYY-MM-DD&to=YYYY-MM-DD | Database-backed report | Unauthenticated in local demo |

Quick health/menu checks:

~~~sh
curl -i http://localhost:8000/up
curl -i http://localhost:8000/api/v1/menu
~~~

### Ingest an event

Laravel sets source and received_at. Browser credentials may submit page_view and custom; server business events use the server credential. order_created must be a server business event.

~~~sh
curl -i http://localhost:8000/api/v1/events -H 'Content-Type: application/json' -H 'X-Analytics-Key: <browser-ingestion-key>' --data '{"event_id":"c5cc5125-9a8d-45e6-bc8c-06457edf334e","event_name":"page_view","event_type":"page_view","application_id":"restaurant-demo","anonymous_id":"0a01b348-7ae9-4dbb-9489-1f0a426cf954","occurred_at":"2026-10-15T10:30:00Z","properties":{},"context":{"path":"/menu","url":"http://localhost:3000/menu"}}'
~~~

Replace the key placeholder with the configured browser key; never use the server key in a browser example.

New events return 202; duplicate IDs return 200 with duplicate true. Invalid/missing credentials return 401; credential/source mismatch returns 403; request body over 64 KB returns 413; validation errors return 422. Properties allow at most 100 top-level entries/16 KB serialized; context allows 32 entries/16 KB. Total body limit is 64 KB.

### Create an order

~~~sh
curl -i http://localhost:8000/api/v1/orders -H 'Content-Type: application/json' -H 'Accept: application/json' --data '{"items":[{"item_id":"pizza-margherita","quantity":1},{"item_id":"fries-classic","quantity":1}]}'
~~~

items contains 1–20 entries; IDs must exist in the menu database, be available, and quantities must be 1–20. The API calculates prices/currency from the database and returns HTTP 201 with persisted order/item details. No payment or customer details are accepted. Order-item rows snapshot the purchased name and unit/line prices, so later menu edits do not change historical orders.

### Analytics report

~~~sh
curl 'http://localhost:8000/api/v1/analytics/overview?from=2026-10-01&to=2026-10-15'
~~~

Dates are inclusive UTC days; omitted dates default to the last seven days including today. Reversed/malformed ranges and ranges over 366 days return 422. Response fields: from, to, timezone, total_page_views, unique_visitors, total_events, orders_created, traffic, visitor_trends, popular_pages, event_counts, event_trends, and up to 20 recent_events. Empty successful reports return zero metrics and zero-filled day series. Database errors are not represented as fabricated empty data. See [API reference](docs/api.md) for response examples.

## SDK integration

@analytics/browser-sdk is private at packages/browser-sdk, not published to npm. Entry point: packages/browser-sdk/src/index.ts; public export: createAnalytics from @analytics/browser-sdk.

~~~ts
import { createAnalytics } from "@analytics/browser-sdk";

const analytics = createAnalytics({
  endpoint: process.env.NEXT_PUBLIC_API_URL + "/api/v1/events",
  applicationId: "restaurant-demo",
  apiKey: process.env.NEXT_PUBLIC_ANALYTICS_API_KEY,
});

void analytics.page();
void analytics.track("menu_item_viewed", { item_id: "pizza-margherita", category: "Pizza" });
analytics.setUserId(null); // Optional; this demo has no signed-in user.
~~~

page() captures path, URL, referrer/title when available, timestamp, anonymous ID, application ID, and SDK version. Anonymous UUID persistence uses localStorage. track() accepts bounded JSON-compatible properties. Restaurant wiring is in apps/restaurant/lib/analytics.ts and components/PageTracker.tsx.

The SDK sends X-Analytics-Key, defaults to a 3-second timeout, and retries at most once on network/5xx failures. Ordinary 4xx responses are not retried. Delivery is best effort; there is no offline queue.

## Event schema and identity

Caller envelope example (Laravel-managed fields omitted):

~~~json
{
  "event_id": "c5cc5125-9a8d-45e6-bc8c-06457edf334e",
  "event_name": "menu_item_viewed",
  "event_type": "custom",
  "application_id": "restaurant-demo",
  "anonymous_id": "0a01b348-7ae9-4dbb-9489-1f0a426cf954",
  "user_id": null,
  "occurred_at": "2026-10-15T10:30:00Z",
  "properties": { "item_id": "pizza-margherita" },
  "context": { "path": "/menu", "url": "http://localhost:3000/menu" }
}
~~~

Supported fields: UUID event_id idempotency key; validated event_name up to 100 characters; event_type (page_view, custom, business); configured application_id; optional UUID anonymous_id/user_id; required parseable occurred_at; optional bounded properties/context. Laravel normalizes event time to UTC and assigns received_at and source. Raw IP addresses are not stored. There are no event edit/delete API routes.

Anonymous ID is a browser-generated UUID in localStorage, not an account or fingerprint. Optional user_id is separate; the demo has no authentication or session identity. Unique visitors are distinct non-null anonymous IDs among page views in the selected range.

## Dashboard metrics

Dashboard ranges are Today, Yesterday, Last 7 days, Last 30 days, and custom UTC dates. A range change triggers a new report request.

- **Page views:** count of event_type=page_view in range.
- **Unique visitors:** distinct non-null anonymous IDs among page views.
- **Popular pages:** page views grouped by non-null path, descending by count.
- **Daily traffic:** zero-filled UTC day page-view series.
- **Visitor trend:** zero-filled daily distinct page-view visitors.
- **Event counts/trends:** event totals/latest occurrence and daily counts for up to six frequent names.
- **Orders created:** server-source order_created count.
- **Recent events:** up to 20 summaries; raw properties are not displayed.

## Restaurant demo and order flow

Laravel serves a database-backed menu. Customers filter categories, view item images/descriptions/availability, adjust cart quantities, and submit item IDs/quantities at checkout. Unavailable items remain visible but cannot be added; checkout and the API also enforce availability. Cart state is browser-local and persisted in localStorage; it is not an order record. The server locks menu rows, calculates current database prices, and transactionally persists order-item snapshots before synchronous best-effort order_created delivery. Tracking failure is logged and does not fail the committed order. Delivery uses a one-second connect timeout and two-second request timeout, with no durable queue/outbox; an event can be lost during an outage.

### Menu management

Dashboard → Menu lists the catalog and supports adding, editing, soft-deleting and changing availability. Images use Laravel's local public disk at `storage/app/public/menu`; run `php artisan storage:link` in the API container so they are served from `/storage`. Uploads accept JPEG, PNG or WebP up to 5 MB. Deleted items are excluded from customer menus, while historical order rows retain their purchased names and prices. Admin endpoints require the server-only `MENU_MANAGEMENT_KEY` header; the dashboard asks the operator to enter it and does not bundle it. Set a random 32+ character value in `apps/api/.env`, then run `docker compose exec api php artisan optimize:clear`. This shared-key mechanism is for the assignment demo, not a production user-account system.

### Order lifecycle

Customer checkout creates a Pending order and links to `/order/{id}` for its itemized status page. The page polls the order API every seven seconds until the order is delivered or cancelled. Admins can open Dashboard → Orders to review the latest 100 orders and update their status. Supported statuses are Pending → Confirmed → Preparing → Out for Delivery → Delivered; cancellation is allowed while pending, confirmed, or preparing. Status changes are recorded through the existing server event ingestion client as `order_confirmed`, `order_preparing`, `order_out_for_delivery`, `order_delivered`, or `order_cancelled` events; repeated updates do not emit duplicate events. This is an intentionally lightweight demonstration workflow, not a production delivery-tracking system. The demo has no authentication, so status administration must not be exposed publicly.

## Technical decisions

| Decision | Reason/benefit | Tradeoff |
| --- | --- | --- |
| Laravel and PostgreSQL JSONB | Relational constraints/indexes plus bounded flexible event data. | Aggregation queries raw rows; no rollups. |
| Shared event envelope and key-derived source | One ingestion contract with browser/server trust distinction. | Public browser key and basic rate limiting do not prevent all abuse. |
| Unique event UUID plus DB constraint | Idempotent concurrent retries. | Retrying callers should reuse event IDs. |
| UTC timestamps and inclusive UTC date ranges | Consistent storage and grouping. | Not visitor-local timezone reporting. |
| Synchronous best-effort delivery | Small system without queue infrastructure. | Events may be lost; order response may wait up to timeout. |
| Database-backed menu and server-owned order snapshots | Supports menu management while keeping order totals and historical purchase details trusted. | Shared-key demo authorization, no inventory or payment. |

This demo uses one application ID and no user login. Menu/order and report endpoints are unauthenticated; add authorization before public deployment.

### Assumptions

- One configured application ID is sufficient for the demo; it is not a multi-tenant key registry.
- Visitor identity is anonymous and browser-local. Cross-device identity and sessions are outside this demo.
- Dates selected in the dashboard refer to UTC calendar days.
- Menu records/prices are database-backed and order submission is a pickup demo without payment or contact information.

### Tradeoffs

- Synchronous PostgreSQL aggregation keeps the system understandable and avoids extra infrastructure, but query-time aggregation is not designed for large event volumes.
- Browser and server tracking use best-effort HTTP delivery. The server order commits first, but events may be lost during an outage because there is no durable queue or transactional outbox.
- Dashboard reports, customer menu/orders and order-status APIs are unauthenticated for local use. Menu-management writes require a shared server key. Public deployment requires user authentication/authorization and operational hardening.

## Known limitations

- No hosted deployment, published SDK package, or durable event queue/replay.
- One application ID and unauthenticated dashboard/report access; not suitable for public exposure as configured.
- Basic framework rate limiting, no advanced bot filtering or consent manager.
- PostgreSQL report aggregation reads raw events; there are no rollups, retention jobs, or high-volume scaling provisions.
- Browser anonymous identity is lost if localStorage is cleared or unavailable.
- Restaurant functionality intentionally excludes payment processing, inventory management, and fulfillment management.

## Security and privacy

- Browser and server keys are separately configured; only the browser key is exposed to frontend code.
- Laravel constant-time compares credentials, checks application ID, derives source, and validates event types.
- Fields and payloads are bounded; event and order routes are rate-limited.
- Eloquent/query-builder bindings are used for database access.
- CORS uses an explicit configured origin list.
- No raw IP, payment data, or customer contact details are stored by the demo.
- Dashboard/report, customer menu/order and order-status endpoints are unauthenticated in this local demo. Menu management uses a server-only shared key; this is not a production account system.

## Tests and build

From repository root:

~~~sh
npm run build:sdk
npm test
npm run typecheck
npm run build
~~~

These cover SDK/dashboard/restaurant tests, TypeScript checks, and Next.js builds. No npm lint script is configured.

From apps/api:

~~~sh
composer validate --no-check-publish
composer test
composer format
~~~

composer test runs php artisan test; PHPUnit uses in-memory SQLite and covers ingestion, validation, idempotency, aggregates/date ranges, order persistence, and analytics failure isolation. composer format runs Laravel Pint and formats files. SQLite tests do not verify PostgreSQL migrations/runtime connectivity.

## Troubleshooting

### Database hostname db cannot resolve

db resolves from API containers on the Compose network. Keep DB_HOST=db inside Compose. For Laravel on the host, use DB_HOST=127.0.0.1 and port 5432. Inside the API container, 127.0.0.1 points to that container.

~~~sh
docker compose config --quiet
docker compose ps
docker compose logs --tail=100 db api
docker compose exec db pg_isready -U analytics -d analytics
docker compose exec api php artisan migrate:status
~~~

Do not delete postgres_data or use docker compose down -v for routine troubleshooting. For Docker socket/daemon errors, start or repair Docker Desktop/Engine and check its context and user access. For CORS errors, ensure CORS_ALLOWED_ORIGINS matches the frontend scheme/host/port and recreate the API container.

### Order creation stalls during analytics tracking

The server posts to ANALYTICS_API_URL after order commit. Compose runs multiple PHP CLI server workers and calls its own loopback endpoint. Keep PHP_CLI_SERVER_WORKERS=4 when starting PHP's development server manually; a single worker can block on the self-request. Tracking failures are logged without rolling back the order.

### Frontend cannot reach the API

Ensure Laravel listens on localhost:8000 and both frontend .env.local files use the same NEXT_PUBLIC_API_URL. Restart Next.js after environment changes. The browser uses host localhost; db is only the container-to-container database hostname.

Inspect API routes with:

~~~sh
docker compose exec api php artisan route:list --path=api
~~~

## Demo and verification workflow

1. Start Compose, run migrations, and seed.
2. Start restaurant and dashboard in separate terminals.
3. Open the restaurant, browse Menu, view item details, add an item, and visit cart/checkout.
4. Place an order and confirm its successful response.
5. Open the dashboard and select a UTC range containing the activity.
6. Check page views, unique visitors, popular paths, events, and server order_created count.
7. For a development loading-state check, append ?debugLoading=true (1 second) or ?debugLoading=500, 1000, or 2000 to a dashboard/restaurant URL. The real request starts immediately; only the loading UI is held for inspection. This switch is disabled in production.

## Final verification checklist

Do not mark an item complete without running it in the target environment:

- [ ] Clone the hosted repository; install with npm ci and Composer from apps/api.
- [x] docker compose config --quiet succeeds; service startup/health remains environment-dependent.
- [ ] PostgreSQL migrations and seeding complete without resetting volumes.
- [ ] /up, menu, ingestion, order, and overview endpoints respond as documented.
- [ ] Browser events persist and duplicate IDs do not create duplicate rows.
- [ ] Orders persist if analytics fails; successful server events appear in reports.
- [ ] Date filters recalculate dashboard metrics from the configured database.
- [x] npm tests/typechecks/builds and Composer validation/tests pass in this workspace.
- [ ] Confirm environment files/secrets are not included in the hosted repository.
- [ ] Add accessible repository and required video links to the assignment submission.

## Further documentation

- [Architecture](docs/architecture.md)
- [Event schema](docs/event-schema.md)
- [API reference](docs/api.md)
- [Engineering decisions](docs/decisions.md)
- [Limitations](docs/limitations.md)

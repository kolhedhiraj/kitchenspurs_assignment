# Project Guide

## Architecture
- `apps/api`: Laravel 12 REST API for event ingestion, demo menu/orders, and dashboard aggregates.
- `apps/dashboard`: Next.js App Router analytics dashboard.
- `apps/restaurant`: Next.js restaurant demo, backed by the Laravel menu/order API.
- `packages/browser-sdk`: framework-independent TypeScript browser analytics client.
- PostgreSQL is the durable store. Docker Compose runs only PostgreSQL and the Laravel API; Next.js development servers run through npm.

## Engineering rules
- Keep request validation, business actions, persistence, and presentation concerns separate.
- Treat all browser input as untrusted. Server-derived fields (source, received time, business event data) are set server-side.
- Keep the demo small and real: no fake API responses or hardcoded dashboard metrics.
- Make analytics delivery best-effort so it cannot fail an order transaction.
- Use UTC for stored/query timestamps and document date-filter boundaries.
- Do not add infrastructure without a concrete requirement.

## Testing
- Run Laravel feature tests against in-memory SQLite, plus PHP syntax/format checks.
- Run SDK unit tests and TypeScript checks.
- Run both Next.js type checks, component tests, and production builds.
- Verify database migrations against PostgreSQL when Docker is available.
- Do not weaken or skip a failing test to make a command pass.

## Security and privacy
- Store secrets only in environment variables; never expose the server ingestion key to frontend code.
- The browser ingestion key is public and only identifies the demo application; enforce input validation and ingestion rate limits.
- Do not persist raw IP addresses or payment information.
- Bound payload, event, identifier, URL, and order sizes. Use Eloquent/query bindings for all data access.

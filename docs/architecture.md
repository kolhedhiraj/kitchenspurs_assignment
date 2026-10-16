# Architecture

```text
Restaurant Next.js app ── browser SDK ──┐
                                        v
Restaurant checkout ── Laravel API ── PostgreSQL
        |                    ^              |
        └─ server analytics ─┘              v
                                  Dashboard API/query ── Next.js dashboard
```

- **Browser SDK:** framework-agnostic TypeScript package. It gives each application a persistent anonymous UUID, explicitly sends page views/custom events, and drops failed deliveries after a bounded retry so the host UI is unaffected.
- **Laravel ingestion API:** validates and authenticates browser/server event requests, derives the source from the credential, assigns receipt timestamps, handles idempotency, persists orders, and returns real aggregate reports.
- **PostgreSQL:** stores event envelopes as JSONB properties/context with relational timestamp, identity, event type, application and path fields for indexed aggregates. It also stores demo orders/items.
- **Restaurant demo:** Next.js pages use Laravel's menu and order endpoints. Menu prices are server-authoritative. After the order transaction commits, Laravel sends `order_created` to its own ingestion endpoint using a server-only credential; delivery is synchronous best effort with a short timeout, and failures are logged without undoing/failing the order.
- **Analytics dashboard:** Next.js fetches date-filtered aggregates from Laravel and renders real API data with loading, error, and empty states. Date bounds mean inclusive UTC calendar days.

The deployment is intentionally a small synchronous system. It has one PostgreSQL database, no queue or distributed event pipeline, and a demo API without user authentication. See `docs/decisions.md` and `docs/limitations.md`.

# Engineering decisions

- **One event envelope:** all sources use `event_id`, `event_name`, `event_type`, `application_id`, optional identities, `occurred_at`, `properties`, and `context`. Laravel supplies `source` and `received_at` from server state.
- **Identity:** the browser SDK stores one UUID per application in localStorage; user identity is optional and distinct. Unique visitors count distinct anonymous IDs among page views in a UTC range.
- **Idempotency:** a unique UUID constraint and PostgreSQL `ON CONFLICT DO NOTHING` via Laravel `insertOrIgnore` make retries safe. Duplicate submissions return successful HTTP 200.
- **Time:** incoming event time is parsed and stored in UTC. API date filters use inclusive UTC calendar dates and are capped at 366 days.
- **Database:** JSONB preserves arbitrary bounded properties/context. Relational application, time, type, name, identity and path columns support the dashboard's common indexed filters/groups.
- **Credentials:** browser and server keys map to distinct source values. Browser keys are public and only identify an app; the server key is never placed in frontend variables. Dashboard read endpoints are open only for local demo simplicity.
- **Browser delivery:** the SDK uses `fetch`, a request timeout, one retry for network/5xx failures, and never propagates delivery errors to the caller as rejected promises.
- **Order analytics:** order rows/items commit first. Laravel then performs a synchronous HTTP call to its own event endpoint with a short timeout. Non-2xx responses and transport errors are logged and do not fail the already-committed order.
- **Orders:** price and currency come from the Laravel menu catalog, never from submitted browser prices. The demo stores no payment details.

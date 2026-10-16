# API reference

Base URL: `http://localhost:8000/api/v1`. All dates are interpreted in UTC. JSON validation errors return HTTP 422. The API is CORS-enabled for the local restaurant/dashboard origins.

## Ingest an event

`POST /events` accepts the envelope described in `docs/event-schema.md` and requires `X-Analytics-Key`. New events return 202; duplicates return 200. Missing/invalid credentials return 401; using a credential for an unsupported source/event type returns 403; bodies over 64 KB return 413.

```sh
curl -X POST http://localhost:8000/api/v1/events \
  -H 'Content-Type: application/json' -H 'X-Analytics-Key: local-browser-key-change-me' \
  --data '{"event_id":"c5cc5125-9a8d-45e6-bc8c-06457edf334e","event_name":"page_view","event_type":"page_view","application_id":"restaurant-demo","anonymous_id":"0a01b348-7ae9-4dbb-9489-1f0a426cf954","occurred_at":"2026-10-15T10:30:00Z","properties":{},"context":{"path":"/menu"}}'
```

Response: `{"success":true,"event_id":"…","duplicate":false}`.

## Get the menu

`GET /menu` returns the configured server-authoritative menu and currency. It requires no body or credential.

## Create a demo order

`POST /orders` accepts `{"items":[{"item_id":"pizza-margherita","quantity":1}]}`. Item IDs and quantities are validated; prices are loaded from the server catalog. Returns 201 with order ID, INR amount, item details, and creation timestamp. No payment data is accepted or stored.

## Get analytics overview

`GET /analytics/overview?from=YYYY-MM-DD&to=YYYY-MM-DD` returns total page views, distinct page-view anonymous visitors, event totals, server order-created count, zero-filled daily page views (`traffic`), zero-filled per-day distinct page-view visitors (`visitor_trends`), popular paths, event counts with `latest_occurrence`, per-day trends for the six most frequent event names in the range, and up to 20 recent event summaries. Each `event_trends` item contains `event_name` and zero-filled `daily_counts` (`date`, `count`) for the whole requested range. `from` and `to` are inclusive UTC calendar days; omitted values default to the last seven UTC days including today. Ranges over 366 days and invalid/reversed dates return 422.

```sh
curl 'http://localhost:8000/api/v1/analytics/overview?from=2026-10-01&to=2026-10-15'
```

Read endpoints are unauthenticated for this local demo; protect them before public deployment.

Example order response (HTTP 201):

```json
{
  "order": {
    "id": 123,
    "amount": 478,
    "currency": "INR",
    "items_count": 2,
    "created_at": "2026-10-15T10:30:00+00:00",
    "items": [
      {"item_id": "pizza-margherita", "name": "Margherita Pizza", "quantity": 1, "unit_price": 349, "line_total": 349},
      {"item_id": "fries-classic", "name": "French Fries", "quantity": 1, "unit_price": 129, "line_total": 129}
    ]
  }
}
```

Example analytics response fields:

```json
{
  "from": "2026-10-01",
  "to": "2026-10-15",
  "timezone": "UTC",
  "total_page_views": 235,
  "unique_visitors": 47,
  "total_events": 512,
  "orders_created": 9,
  "traffic": [{"date": "2026-10-01", "page_views": 13}],
  "visitor_trends": [{"date": "2026-10-01", "unique_visitors": 8}],
  "popular_pages": [{"path": "/menu", "views": 92}],
  "event_counts": [{"event_name": "page_view", "count": 235, "latest_occurrence": "2026-10-15T10:30:00+00:00"}],
  "event_trends": [{"event_name": "page_view", "daily_counts": [{"date": "2026-10-01", "count": 13}]}],
  "recent_events": []
}
```

These numbers are response-shape examples only; the API calculates all values from persisted events and never returns these fixed sample counts.

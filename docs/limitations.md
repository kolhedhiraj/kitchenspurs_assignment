# Limitations

- No queue or durable retry pipeline. A server analytics event can be lost if ingestion is unavailable after an order commits; the order still succeeds. Browser delivery is best effort with one bounded retry.
- One PostgreSQL database and a single demo application ID. There is no tenant key registry or per-customer isolation model.
- Browser keys are public; rate limiting is basic and IP-based at the framework layer. Production use needs abuse monitoring and stronger operational controls.
- Dashboard read APIs are unauthenticated for this local demo. Add application authentication/authorization before exposing them publicly.
- Anonymous identity relies on localStorage and resets when browser storage is cleared. There is no account login or cross-device identity stitching.
- Aggregates are computed from raw event rows at query time. Large datasets would need rollups/retention planning, but no extra infrastructure is justified for this demo.
- No advanced bot filtering, consent manager, payment processing, inventory, or real restaurant fulfillment.
- The server analytics HTTP call is synchronous and bounded by a two-second timeout; a queue/outbox would be appropriate if stronger delivery guarantees are needed.

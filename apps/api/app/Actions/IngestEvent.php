<?php

namespace App\Actions;

use App\Models\Event;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class IngestEvent
{
    /** @param array<string, mixed> $payload
     * @return array{success: bool, event_id: string, duplicate: bool}
     */
    public function handle(array $payload, string $source): array
    {
        if ($payload['application_id'] !== config('analytics.application_id')) {
            throw new AuthorizationException('Unknown analytics application.');
        }

        if ($source === 'browser' && ! in_array($payload['event_type'], ['page_view', 'custom'], true)) {
            throw new AuthorizationException('Browser credentials cannot submit server business events.');
        }

        if ($payload['event_name'] === 'order_created' && ($source !== 'server' || $payload['event_type'] !== 'business')) {
            throw new AuthorizationException('Order events must be emitted by the server.');
        }

        $context = $payload['context'] ?? [];
        $now = CarbonImmutable::now('UTC')->format('Y-m-d H:i:s.uP');
        $inserted = DB::transaction(fn (): int => Event::query()->insertOrIgnore([[
            'event_id' => $payload['event_id'],
            'application_id' => $payload['application_id'],
            'event_name' => $payload['event_name'],
            'event_type' => $payload['event_type'],
            'source' => $source,
            'anonymous_id' => $payload['anonymous_id'] ?? null,
            'user_id' => $payload['user_id'] ?? null,
            'path' => $context['path'] ?? null,
            'occurred_at' => CarbonImmutable::parse($payload['occurred_at'])->utc()->format('Y-m-d H:i:s.uP'),
            'received_at' => $now,
            'properties' => isset($payload['properties']) ? json_encode($payload['properties'], JSON_THROW_ON_ERROR) : null,
            'context' => isset($payload['context']) ? json_encode($payload['context'], JSON_THROW_ON_ERROR) : null,
            'created_at' => $now,
            'updated_at' => $now,
        ]]));

        return ['success' => true, 'event_id' => $payload['event_id'], 'duplicate' => $inserted === 0];
    }
}

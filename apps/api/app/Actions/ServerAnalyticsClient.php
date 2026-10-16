<?php

namespace App\Actions;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class ServerAnalyticsClient
{
    /** @param array<string, mixed> $properties */
    public function trackBusinessEvent(string $name, array $properties): bool
    {
        $key = config('analytics.ingestion.server_key');
        if (! is_string($key) || $key === '') {
            Log::warning('Server analytics event was not sent because SERVER_INGESTION_KEY is not configured.', ['event_name' => $name]);

            return false;
        }

        try {
            $response = Http::connectTimeout(1)
                ->timeout(2)
                ->withHeader('X-Analytics-Key', $key)
                ->post(config('analytics.api_url'), [
                    'event_id' => (string) Str::uuid(),
                    'event_name' => $name,
                    'event_type' => 'business',
                    'application_id' => config('analytics.application_id'),
                    'anonymous_id' => null,
                    'user_id' => null,
                    'occurred_at' => now('UTC')->toIso8601ZuluString(),
                    'properties' => $properties,
                    'context' => [],
                ]);

            if (! $response->successful()) {
                Log::warning('Server analytics API rejected an event.', [
                    'event_name' => $name,
                    'status' => $response->status(),
                ]);

                return false;
            }

            return true;
        } catch (Throwable $exception) {
            Log::warning('Server analytics delivery failed; business operation is unaffected.', [
                'event_name' => $name,
                'exception' => $exception::class,
            ]);

            return false;
        }
    }
}

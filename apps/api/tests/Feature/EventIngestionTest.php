<?php

namespace Tests\Feature;

use App\Models\Event;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class EventIngestionTest extends TestCase
{
    use RefreshDatabase;

    private const BROWSER_KEY = 'test-browser-key';

    private const SERVER_KEY = 'test-server-secret';

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('analytics.ingestion.browser_key', self::BROWSER_KEY);
        config()->set('analytics.ingestion.server_key', self::SERVER_KEY);
    }

    public function test_accepts_a_valid_browser_event_and_sets_server_metadata(): void
    {
        $event = $this->event();
        $event['received_at'] = '2000-01-01T00:00:00Z';

        $this->postJson('/api/v1/events', $event, $this->key(self::BROWSER_KEY))
            ->assertAccepted()
            ->assertJson(['success' => true, 'event_id' => $event['event_id'], 'duplicate' => false]);

        $stored = Event::query()->firstOrFail();
        $this->assertSame('browser', $stored->source);
        $this->assertNotSame('2000-01-01 00:00:00', $stored->received_at->format('Y-m-d H:i:s'));
        $this->assertSame('/menu', $stored->path);
    }

    public function test_accepts_server_business_events_only_with_the_server_key(): void
    {
        $payload = $this->event(['event_name' => 'order_created', 'event_type' => 'business']);

        $this->postJson('/api/v1/events', $payload, $this->key(self::SERVER_KEY))
            ->assertAccepted();

        $this->assertDatabaseHas('events', ['event_id' => $payload['event_id'], 'source' => 'server']);
    }

    public function test_rejects_invalid_payloads(): void
    {
        $this->postJson('/api/v1/events', ['event_name' => 'page_view'], $this->key(self::BROWSER_KEY))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['event_id', 'event_type', 'application_id', 'occurred_at']);
    }

    public function test_event_id_is_required_and_valid(): void
    {
        $payload = $this->event();
        unset($payload['event_id']);
        $this->postJson('/api/v1/events', $payload, $this->key(self::BROWSER_KEY))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('event_id');

        $payload['event_id'] = 'not-a-uuid';
        $this->postJson('/api/v1/events', $payload, $this->key(self::BROWSER_KEY))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('event_id');
    }

    public function test_anonymous_id_must_be_a_uuid_when_provided(): void
    {
        $this->postJson('/api/v1/events', $this->event(['anonymous_id' => 'visitor-1']), $this->key(self::BROWSER_KEY))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('anonymous_id');
    }

    public function test_event_name_must_match_the_supported_format_and_length(): void
    {
        foreach (['', str_repeat('x', 101), 'invalid name'] as $name) {
            $this->postJson('/api/v1/events', $this->event(['event_name' => $name]), $this->key(self::BROWSER_KEY))
                ->assertUnprocessable()
                ->assertJsonValidationErrors('event_name');
        }
    }

    public function test_rejects_unknown_event_types_and_application_ids(): void
    {
        $this->postJson('/api/v1/events', $this->event(['event_type' => 'other']), $this->key(self::BROWSER_KEY))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('event_type');

        $this->postJson('/api/v1/events', $this->event(['application_id' => 'other-app']), $this->key(self::BROWSER_KEY))
            ->assertForbidden();
    }

    public function test_page_view_name_and_type_must_be_consistent(): void
    {
        $this->postJson('/api/v1/events', $this->event(['event_type' => 'custom']), $this->key(self::BROWSER_KEY))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('event_type');

        $this->postJson('/api/v1/events', $this->event(['event_name' => 'menu_item_viewed', 'event_type' => 'page_view']), $this->key(self::BROWSER_KEY))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('event_type');
    }

    public function test_event_id_is_idempotent(): void
    {
        $event = $this->event();
        $this->postJson('/api/v1/events', $event, $this->key(self::BROWSER_KEY))
            ->assertAccepted()
            ->assertJsonPath('duplicate', false);
        $this->postJson('/api/v1/events', $event, $this->key(self::BROWSER_KEY))
            ->assertOk()
            ->assertJsonPath('duplicate', true);

        $this->assertDatabaseCount('events', 1);
    }

    public function test_accepts_json_properties_and_rejects_oversized_properties(): void
    {
        $payload = $this->event(['properties' => ['section' => 'desserts', 'rank' => 2]]);
        $this->postJson('/api/v1/events', $payload, $this->key(self::BROWSER_KEY))->assertAccepted();
        $this->assertSame($payload['properties'], Event::query()->firstOrFail()->properties);

        $payload = $this->event(['properties' => ['large' => str_repeat('x', 17 * 1024)]]);
        $this->postJson('/api/v1/events', $payload, $this->key(self::BROWSER_KEY))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('properties');

        $payload = $this->event(['properties' => array_fill_keys(array_map(fn (int $i): string => "key_{$i}", range(1, 101)), true)]);
        $this->postJson('/api/v1/events', $payload, $this->key(self::BROWSER_KEY))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('properties');
    }

    public function test_normalizes_occurred_at_and_ignores_client_source(): void
    {
        $payload = $this->event(['occurred_at' => '2026-10-15T12:30:00+02:00', 'source' => 'server']);
        $this->postJson('/api/v1/events', $payload, $this->key(self::BROWSER_KEY))->assertAccepted();
        $stored = Event::query()->firstOrFail();
        $this->assertSame('2026-10-15 10:30:00', $stored->occurred_at->utc()->format('Y-m-d H:i:s'));
        $this->assertSame('browser', $stored->source);
    }

    public function test_requires_an_authenticating_ingestion_key(): void
    {
        $this->postJson('/api/v1/events', $this->event())->assertUnauthorized();
        $this->postJson('/api/v1/events', $this->event(), $this->key('wrong'))->assertUnauthorized();
        $this->postJson('/api/v1/events', $this->event(['event_name' => 'order_created', 'event_type' => 'business']), $this->key(self::BROWSER_KEY))
            ->assertForbidden();
    }

    public function test_ingestion_rate_limit_returns_too_many_requests(): void
    {
        for ($request = 0; $request < 120; $request++) {
            $this->postJson('/api/v1/events', $this->event(), $this->key(self::BROWSER_KEY))
                ->assertAccepted();
        }

        $this->postJson('/api/v1/events', $this->event(), $this->key(self::BROWSER_KEY))
            ->assertTooManyRequests();
    }

    /** @return array<string, mixed> */
    private function event(array $overrides = []): array
    {
        return array_merge([
            'event_id' => (string) Str::uuid(),
            'event_name' => 'page_view',
            'event_type' => 'page_view',
            'application_id' => 'restaurant-demo',
            'anonymous_id' => (string) Str::uuid(),
            'user_id' => null,
            'occurred_at' => '2026-10-15T10:30:00Z',
            'properties' => ['source' => 'test'],
            'context' => [
                'path' => '/menu',
                'url' => 'https://restaurant.test/menu',
                'referrer' => '/',
                'title' => 'Menu',
                'user_agent' => 'Feature Test',
                'sdk_version' => '0.1.0',
            ],
        ], $overrides);
    }

    /** @return array<string, string> */
    private function key(string $value): array
    {
        return ['X-Analytics-Key' => $value];
    }
}

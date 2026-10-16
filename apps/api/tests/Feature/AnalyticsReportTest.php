<?php

namespace Tests\Feature;

use App\Models\Event;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AnalyticsReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_overview_counts_page_views_visitors_orders_and_popular_pages_with_date_filters(): void
    {
        $this->event('page_view', 'page_view', 'anon-1', '/menu', '2026-10-14 10:00:00+00:00');
        $this->event('page_view', 'page_view', 'anon-1', '/menu', '2026-10-14 12:00:00+00:00');
        $this->event('page_view', 'page_view', 'anon-2', '/', '2026-10-15 09:00:00+00:00');
        $this->event('add_to_cart', 'custom', 'anon-2', '/menu', '2026-10-15 09:30:00+00:00');
        $this->event('order_created', 'business', null, null, '2026-10-15 10:00:00+00:00', 'server');
        $this->event('page_view', 'page_view', 'outside', '/', '2026-10-16 00:00:00+00:00');

        $this->getJson('/api/v1/analytics/overview?from=2026-10-14&to=2026-10-15')
            ->assertOk()
            ->assertJsonPath('timezone', 'UTC')
            ->assertJsonPath('total_page_views', 3)
            ->assertJsonPath('unique_visitors', 2)
            ->assertJsonPath('total_events', 5)
            ->assertJsonPath('orders_created', 1)
            ->assertJsonPath('traffic.0.date', '2026-10-14')
            ->assertJsonPath('traffic.0.page_views', 2)
            ->assertJsonPath('traffic.1.date', '2026-10-15')
            ->assertJsonPath('traffic.1.page_views', 1)
            ->assertJsonPath('visitor_trends.0.unique_visitors', 1)
            ->assertJsonPath('visitor_trends.1.unique_visitors', 1)
            ->assertJsonPath('popular_pages.0.path', '/menu')
            ->assertJsonPath('popular_pages.0.views', 2)
            ->assertJsonPath('event_trends.0.event_name', 'page_view')
            ->assertJsonPath('event_trends.0.daily_counts.0.date', '2026-10-14')
            ->assertJsonPath('event_trends.0.daily_counts.0.count', 2)
            ->assertJsonPath('event_trends.0.daily_counts.1.count', 1);
        $this->getJson('/api/v1/analytics/overview?from=2026-10-14&to=2026-10-15')
            ->assertJsonPath('event_counts.0.latest_occurrence', '2026-10-15T09:00:00+00:00');
    }

    public function test_empty_overview_returns_zero_filled_daily_series(): void
    {
        $this->getJson('/api/v1/analytics/overview?from=2026-10-14&to=2026-10-15')
            ->assertOk()
            ->assertJsonPath('total_page_views', 0)
            ->assertJsonPath('unique_visitors', 0)
            ->assertJsonPath('traffic.0.page_views', 0)
            ->assertJsonPath('visitor_trends.0.unique_visitors', 0)
            ->assertJsonPath('event_trends', []);
    }

    public function test_overview_rejects_invalid_or_unbounded_date_ranges(): void
    {
        $this->getJson('/api/v1/analytics/overview?from=2026-10-30&to=2026-10-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('to');
        $this->getJson('/api/v1/analytics/overview?from=2024-01-01&to=2026-10-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('to');
    }

    private function event(string $name, string $type, ?string $anonymous, ?string $path, string $occurredAt, string $source = 'browser'): void
    {
        Event::query()->create([
            'event_id' => (string) Str::uuid(),
            'application_id' => 'restaurant-demo',
            'event_name' => $name,
            'event_type' => $type,
            'source' => $source,
            'anonymous_id' => $anonymous,
            'path' => $path,
            'occurred_at' => $occurredAt,
            'received_at' => now('UTC'),
            'properties' => [],
            'context' => [],
        ]);
    }
}

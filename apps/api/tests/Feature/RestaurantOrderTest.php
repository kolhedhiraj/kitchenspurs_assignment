<?php

namespace Tests\Feature;

use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RestaurantOrderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('analytics.ingestion.server_key', 'server-test-key');
        config()->set('analytics.api_url', 'http://analytics.test/api/v1/events');
    }

    public function test_menu_is_served_from_the_authoritative_catalog(): void
    {
        $this->getJson('/api/v1/menu')->assertOk()->assertJsonPath('currency', 'INR')->assertJsonCount(5, 'items');
    }

    public function test_order_total_uses_server_menu_prices_and_emits_server_analytics(): void
    {
        Http::fake(fn () => Http::response(['success' => true], 202));

        $this->postJson('/api/v1/orders', ['items' => [
            ['item_id' => 'pizza-margherita', 'quantity' => 1],
            ['item_id' => 'fries-classic', 'quantity' => 1],
        ]])->assertCreated()
            ->assertJsonPath('order.amount', 478)
            ->assertJsonPath('order.currency', 'INR')
            ->assertJsonPath('order.items_count', 2);

        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('order_items', 2);
        Http::assertSent(fn ($request): bool => $request->url() === 'http://analytics.test/api/v1/events'
            && $request->hasHeader('X-Analytics-Key', 'server-test-key')
            && $request['event_name'] === 'order_created'
            && $request['event_type'] === 'business'
            && $request['properties']['amount'] === 478);
    }

    public function test_order_succeeds_if_analytics_returns_an_error(): void
    {
        Http::fake(fn () => Http::response(['message' => 'unavailable'], 503));

        $this->postJson('/api/v1/orders', ['items' => [['item_id' => 'burger-classic', 'quantity' => 2]]])
            ->assertCreated()
            ->assertJsonPath('order.amount', 598);

        $this->assertDatabaseCount('orders', 1);
    }

    public function test_order_succeeds_if_analytics_connection_fails(): void
    {
        Http::fake(fn () => throw new ConnectionException('API is offline'));

        $this->postJson('/api/v1/orders', ['items' => [['item_id' => 'salad-caesar', 'quantity' => 1]]])
            ->assertCreated();

        $this->assertDatabaseCount('orders', 1);
    }

    public function test_order_rejects_unknown_items_and_invalid_quantities(): void
    {
        $this->postJson('/api/v1/orders', ['items' => [['item_id' => 'unknown', 'quantity' => 1]]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('items.0.item_id');
        $this->assertSame(0, Order::query()->count());
    }
}

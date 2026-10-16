<?php

namespace Database\Seeders;

use App\Models\Event;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $today = CarbonImmutable::now('UTC')->startOfDay();
        $pages = ['/', '/menu', '/cart', '/checkout'];
        $visitors = array_map(fn (int $number): string => $this->uuid("demo-visitor:{$number}"), range(1, 18));

        for ($dayOffset = 29; $dayOffset >= 0; $dayOffset--) {
            $day = $today->subDays($dayOffset);
            $dateKey = $day->toDateString();
            foreach ($visitors as $visitorIndex => $visitorId) {
                $path = $pages[($dayOffset + $visitorIndex) % count($pages)];
                $this->record(
                    "page-{$dateKey}-{$visitorIndex}", 'page_view', 'page_view', 'browser', $day->addHours(8 + ($visitorIndex % 10)),
                    $visitorId, ['path' => $path], ['path' => $path, 'url' => 'http://localhost:3000'.$path, 'title' => ucfirst(trim($path, '/')) ?: 'Home'],
                );
            }

            foreach (range(0, 4) as $interaction) {
                $visitor = $visitors[($dayOffset * 3 + $interaction) % count($visitors)];
                $this->record(
                    "menu-item-{$dateKey}-{$interaction}", 'menu_item_viewed', 'custom', 'browser', $day->addHours(10)->addMinutes($interaction),
                    $visitor, ['item_id' => ['pizza-margherita', 'burger-classic', 'pasta-alfredo', 'salad-caesar', 'fries-classic'][$interaction]],
                    ['path' => '/menu', 'url' => 'http://localhost:3000/menu'],
                );
            }

            foreach (range(0, 2) as $interaction) {
                $this->record(
                    "cart-{$dateKey}-{$interaction}", 'add_to_cart', 'custom', 'browser', $day->addHours(15)->addMinutes($interaction),
                    $visitors[($dayOffset + $interaction) % count($visitors)], ['item_id' => 'pizza-margherita', 'quantity' => 1],
                    ['path' => '/menu', 'url' => 'http://localhost:3000/menu'],
                );
            }

            if ($dayOffset % 3 === 0) {
                $this->record("checkout-{$dateKey}", 'checkout_started', 'custom', 'browser', $day->addHours(18), $visitors[$dayOffset % count($visitors)], [], ['path' => '/checkout']);
            }

            if ($dayOffset % 7 === 0) {
                $this->record("order-{$dateKey}", 'order_created', 'business', 'server', $day->addHours(19), null,
                    ['order_id' => "DEMO-{$dayOffset}", 'amount' => 478 + ($dayOffset % 3) * 100, 'currency' => 'INR', 'items_count' => 2], []);
            }
        }
    }

    /** @param array<string, mixed> $properties
     * @param  array<string, mixed>  $context
     */
    private function record(string $key, string $name, string $type, string $source, CarbonImmutable $occurredAt, ?string $anonymousId, array $properties, array $context): void
    {
        Event::query()->updateOrCreate(
            ['event_id' => $this->uuid("analytics-demo:{$key}")],
            [
                'application_id' => config('analytics.application_id', 'restaurant-demo'),
                'event_name' => $name,
                'event_type' => $type,
                'source' => $source,
                'anonymous_id' => $anonymousId,
                'path' => $context['path'] ?? null,
                'occurred_at' => $occurredAt,
                'received_at' => $occurredAt->addSeconds(2),
                'properties' => $properties,
                'context' => $context,
            ],
        );
    }

    private function uuid(string $value): string
    {
        $hex = substr(hash('sha256', $value), 0, 32);
        $hex[12] = '5';
        $hex[16] = dechex((hexdec($hex[16]) & 0x3) | 0x8);

        return sprintf('%s-%s-%s-%s-%s', substr($hex, 0, 8), substr($hex, 8, 4), substr($hex, 12, 4), substr($hex, 16, 4), substr($hex, 20));
    }
}

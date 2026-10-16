<?php

namespace App\Actions;

use App\Models\Order;
use Illuminate\Support\Facades\DB;

class CreateRestaurantOrder
{
    /** @param array<int, array{item_id: string, quantity: int}> $items */
    public function handle(array $items): Order
    {
        $menu = collect(config('restaurant.menu'))->keyBy('id');

        return DB::transaction(function () use ($items, $menu): Order {
            $order = Order::query()->create([
                'total_amount' => collect($items)->sum(fn (array $item): int => $menu[$item['item_id']]['price'] * $item['quantity']),
                'currency' => config('restaurant.currency', 'INR'),
            ]);

            foreach ($items as $item) {
                $product = $menu[$item['item_id']];
                $order->items()->create([
                    'item_id' => $product['id'],
                    'name' => $product['name'],
                    'unit_price' => $product['price'],
                    'quantity' => $item['quantity'],
                    'line_total' => $product['price'] * $item['quantity'],
                ]);
            }

            return $order->load('items');
        });
    }
}

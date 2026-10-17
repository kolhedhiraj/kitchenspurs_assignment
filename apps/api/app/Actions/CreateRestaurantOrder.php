<?php

namespace App\Actions;

use App\Models\MenuItem;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateRestaurantOrder
{
    /** @param array<int, array{item_id: string, quantity: int}> $items */
    public function handle(array $items): Order
    {
        return DB::transaction(function () use ($items): Order {
            $menu = MenuItem::query()->whereIn('id', array_column($items, 'item_id'))->lockForUpdate()->get()->keyBy('id');
            foreach ($items as $index => $item) {
                $product = $menu->get($item['item_id']);
                if (! $product || ! $product->is_available) {
                    $name = $product?->name ?? 'This menu item';
                    throw ValidationException::withMessages(["items.{$index}.item_id" => "{$name} is currently unavailable."]);
                }
            }

            $order = Order::query()->create([
                'status' => 'pending',
                'total_amount' => collect($items)->sum(fn (array $item): int => $menu[$item['item_id']]->price * $item['quantity']),
                'currency' => config('restaurant.currency', 'INR'),
            ]);

            foreach ($items as $item) {
                $product = $menu[$item['item_id']];
                $order->items()->create([
                    'item_id' => $product->id,
                    'name' => $product->name,
                    'unit_price' => $product->price,
                    'quantity' => $item['quantity'],
                    'line_total' => $product->price * $item['quantity'],
                ]);
            }

            return $order->load('items');
        });
    }
}

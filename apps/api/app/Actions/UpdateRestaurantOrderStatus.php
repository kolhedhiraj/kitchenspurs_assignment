<?php

namespace App\Actions;

use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateRestaurantOrderStatus
{
    private const TRANSITIONS = [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['preparing', 'cancelled'],
        'preparing' => ['out_for_delivery', 'cancelled'],
        'out_for_delivery' => ['delivered'],
        'delivered' => [],
        'cancelled' => [],
    ];

    /** @return array{order: Order, changed: bool} */
    public function handle(int $orderId, string $status): array
    {
        return DB::transaction(function () use ($orderId, $status): array {
            $order = Order::query()->with('items')->lockForUpdate()->findOrFail($orderId);
            if ($order->status === $status) {
                return ['order' => $order, 'changed' => false];
            }
            if (! in_array($status, self::TRANSITIONS[$order->status] ?? [], true)) {
                throw ValidationException::withMessages(['status' => 'This order cannot move from '.$order->status.' to '.$status.'.']);
            }

            $order->status = $status;
            $order->save();

            return ['order' => $order->fresh('items'), 'changed' => true];
        });
    }
}

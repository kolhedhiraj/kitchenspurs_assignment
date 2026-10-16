<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\CreateRestaurantOrder;
use App\Actions\ServerAnalyticsClient;
use App\Http\Requests\Api\V1\StoreOrderRequest;
use Illuminate\Http\JsonResponse;

class OrderController
{
    public function store(
        StoreOrderRequest $request,
        CreateRestaurantOrder $createOrder,
        ServerAnalyticsClient $analytics,
    ): JsonResponse {
        $order = $createOrder->handle($request->validated('items'));

        // This HTTP delivery happens after commit and is best-effort.
        $analytics->trackBusinessEvent('order_created', [
            'order_id' => $order->id,
            'amount' => $order->total_amount,
            'currency' => $order->currency,
            'items_count' => $order->items->sum('quantity'),
        ]);

        return response()->json([
            'order' => [
                'id' => $order->id,
                'amount' => $order->total_amount,
                'currency' => $order->currency,
                'items_count' => $order->items->sum('quantity'),
                'created_at' => $order->created_at->toIso8601String(),
                'items' => $order->items->map(fn ($item): array => [
                    'item_id' => $item->item_id,
                    'name' => $item->name,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'line_total' => $item->line_total,
                ]),
            ],
        ], 201);
    }
}

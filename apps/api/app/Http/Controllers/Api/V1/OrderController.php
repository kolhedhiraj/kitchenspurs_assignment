<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\CreateRestaurantOrder;
use App\Actions\ServerAnalyticsClient;
use App\Actions\UpdateRestaurantOrderStatus;
use App\Http\Requests\Api\V1\StoreOrderRequest;
use App\Http\Requests\Api\V1\UpdateOrderStatusRequest;
use App\Models\Order;
use Illuminate\Http\JsonResponse;

class OrderController
{
    public function index(): JsonResponse
    {
        return response()->json(['orders' => Order::query()->with('items')->latest()->limit(100)->get()->map(fn (Order $order): array => $this->present($order))]);
    }

    public function show(int $order): JsonResponse
    {
        return response()->json(['order' => $this->present(Order::query()->with('items')->findOrFail($order))]);
    }

    public function updateStatus(
        UpdateOrderStatusRequest $request,
        int $order,
        UpdateRestaurantOrderStatus $updateStatus,
        ServerAnalyticsClient $analytics,
    ): JsonResponse {
        $result = $updateStatus->handle($order, $request->validated('status'));
        if ($result['changed']) {
            $analytics->trackBusinessEvent('order_'.$result['order']->status, [
                'order_id' => $result['order']->id,
                'status' => $result['order']->status,
            ]);
        }

        return response()->json(['order' => $this->present($result['order'])]);
    }

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
                'status' => $order->status,
                'status_label' => Order::STATUS_LABELS[$order->status],
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

    /** @return array<string, mixed> */
    private function present(Order $order): array
    {
        return [
            'id' => $order->id,
            'status' => $order->status,
            'status_label' => Order::STATUS_LABELS[$order->status],
            'amount' => $order->total_amount,
            'currency' => $order->currency,
            'items_count' => $order->items->sum('quantity'),
            'created_at' => $order->created_at->toIso8601String(),
            'updated_at' => $order->updated_at->toIso8601String(),
            'items' => $order->items->map(fn ($item): array => [
                'item_id' => $item->item_id,
                'name' => $item->name,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'line_total' => $item->line_total,
            ])->values(),
        ];
    }
}

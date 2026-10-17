<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\MenuItem;
use App\Models\MenuCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class MenuController
{
    public function index(): JsonResponse
    {
        return response()->json([
            'currency' => config('restaurant.currency'),
            'categories' => MenuCategory::query()->orderBy('name')->get(['id', 'name']),
            'items' => MenuItem::query()->with('menuCategory')->orderBy('category_id')->orderBy('name')->get()->map(fn (MenuItem $item): array => $this->present($item)),
        ]);
    }

    /** @return array<string, mixed> */
    public function present(MenuItem $item): array
    {
        return [
            'id' => $item->id,
            'name' => $item->name,
            'category' => $item->menuCategory?->name,
            'category_id' => $item->category_id,
            'description' => $item->description,
            'price' => $item->price,
            'image_url' => $item->image_path ? Storage::disk('public')->url($item->image_path) : null,
            'is_available' => $item->is_available,
            'created_at' => $item->created_at->toIso8601String(),
            'updated_at' => $item->updated_at->toIso8601String(),
        ];
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Api\V1\StoreMenuItemRequest;
use App\Http\Requests\Api\V1\UpdateMenuAvailabilityRequest;
use App\Http\Requests\Api\V1\UpdateMenuItemRequest;
use App\Models\MenuItem;
use App\Models\MenuCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class AdminMenuController
{
    public function index(MenuController $menu): JsonResponse
    {
        return response()->json([
            'currency' => config('restaurant.currency'),
            'categories' => MenuCategory::query()->orderBy('name')->get(['id', 'name']),
            'items' => MenuItem::query()->with('menuCategory')->orderByDesc('created_at')->get()->map(fn (MenuItem $item): array => $menu->present($item)),
        ]);
    }

    public function show(MenuItem $menuItem, MenuController $menu): JsonResponse
    {
        return response()->json(['item' => $menu->present($menuItem)]);
    }

    public function store(StoreMenuItemRequest $request, MenuController $menu): JsonResponse
    {
        $data = $request->validated();
        $imagePath = $this->storeImage($request);
        if (! $imagePath) {
            return response()->json(['message' => 'The image could not be saved. Please try another image.'], 422);
        }

        try {
            $item = MenuItem::query()->create([
                'id' => Str::slug($data['name']).'-'.Str::lower(Str::random(6)),
                'name' => $data['name'],
                'description' => $data['description'],
                'category_id' => $data['category_id'] ?? MenuCategory::query()->where('name', $data['category'])->value('id'),
                'price' => $data['price'],
                'is_available' => $data['is_available'],
                'image_path' => $imagePath,
            ]);
        } catch (Throwable $exception) {
            Storage::disk('public')->delete($imagePath);
            throw $exception;
        }

        return response()->json(['message' => 'Menu item added successfully.', 'item' => $menu->present($item)], 201);
    }

    public function update(UpdateMenuItemRequest $request, MenuItem $menuItem, MenuController $menu): JsonResponse
    {
        $data = $request->validated();
        $newImagePath = $request->hasFile('image') ? $this->storeImage($request) : null;
        if ($request->hasFile('image') && ! $newImagePath) {
            return response()->json(['message' => 'The image could not be saved. Please try another image.'], 422);
        }

        $oldImagePath = $menuItem->image_path;
        try {
            unset($data['image']);
            if (isset($data['category'])) {
                $data['category_id'] = MenuCategory::query()->where('name', $data['category'])->value('id');
                unset($data['category']);
            }
            if ($newImagePath) {
                $data['image_path'] = $newImagePath;
            }
            DB::transaction(fn () => $menuItem->update($data));
        } catch (Throwable $exception) {
            if ($newImagePath) {
                Storage::disk('public')->delete($newImagePath);
            }
            throw $exception;
        }

        if ($newImagePath && $oldImagePath) {
            Storage::disk('public')->delete($oldImagePath);
        }

        return response()->json(['message' => 'Menu item updated successfully.', 'item' => $menu->present($menuItem->fresh())]);
    }

    public function updateAvailability(UpdateMenuAvailabilityRequest $request, MenuItem $menuItem, MenuController $menu): JsonResponse
    {
        $menuItem->update($request->validated());

        return response()->json(['message' => 'Menu item availability updated.', 'item' => $menu->present($menuItem->fresh())]);
    }

    public function destroy(MenuItem $menuItem): JsonResponse
    {
        $imagePath = $menuItem->image_path;
        $menuItem->delete();
        if ($imagePath) {
            Storage::disk('public')->delete($imagePath);
        }

        return response()->json(['message' => 'Menu item removed successfully.']);
    }

    private function storeImage(StoreMenuItemRequest|UpdateMenuItemRequest $request): string|false
    {
        $image = $request->file('image');

        return $image ? Storage::disk('public')->putFile('menu', $image) : false;
    }
}

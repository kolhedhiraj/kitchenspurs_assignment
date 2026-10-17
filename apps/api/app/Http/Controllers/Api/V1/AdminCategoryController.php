<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\MenuCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminCategoryController
{
    public function index(): JsonResponse
    {
        return response()->json(['categories' => MenuCategory::query()->orderBy('name')->get(['id', 'name'])]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:80', 'unique:menu_categories,name']]);
        $category = MenuCategory::query()->create($data);

        return response()->json(['message' => 'Category added successfully.', 'category' => $category], 201);
    }

    public function update(Request $request, MenuCategory $category): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:80', Rule::unique('menu_categories', 'name')->ignore($category->id)]]);
        $category->update($data);

        return response()->json(['message' => 'Category updated successfully.', 'category' => $category->fresh()]);
    }

    public function destroy(MenuCategory $category): JsonResponse
    {
        if ($category->menuItems()->withTrashed()->exists()) {
            return response()->json(['message' => 'This category still contains menu items. Reassign those items before deleting the category.'], 409);
        }

        $category->delete();

        return response()->json(['message' => 'Category deleted successfully.']);
    }
}

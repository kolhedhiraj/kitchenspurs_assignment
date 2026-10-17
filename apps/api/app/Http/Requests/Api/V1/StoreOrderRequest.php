<?php

namespace App\Http\Requests\Api\V1;

use App\Models\MenuItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'list', 'min:1', 'max:20'],
            'items.*' => ['required', 'array'],
            'items.*.item_id' => ['required', 'string', Rule::exists('menu_items', 'id')->whereNull('deleted_at')],
            'items.*.quantity' => ['required', 'integer', 'between:1,20'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $items = $this->input('items');
            if (! is_array($items)) {
                return;
            }

            $ids = collect($items)->pluck('item_id')->filter(fn ($id): bool => is_string($id))->unique();
            $menu = MenuItem::query()->whereIn('id', $ids)->get()->keyBy('id');
            foreach ($items as $index => $item) {
                $menuItem = is_array($item) && is_string($item['item_id'] ?? null) ? $menu->get($item['item_id']) : null;
                if ($menuItem && ! $menuItem->is_available) {
                    $validator->errors()->add("items.{$index}.item_id", "{$menuItem->name} is currently unavailable.");
                }
            }
        });
    }
}

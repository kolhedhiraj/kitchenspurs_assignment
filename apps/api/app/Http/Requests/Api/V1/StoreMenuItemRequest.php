<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMenuItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'description' => ['required', 'string', 'max:1000'],
            'category_id' => ['required_without:category', 'integer', 'exists:menu_categories,id'],
            'category' => ['required_without:category_id', 'string', Rule::exists('menu_categories', 'name')],
            'price' => ['required', 'integer', 'min:0', 'max:1000000'],
            'image' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'is_available' => ['required', 'boolean'],
        ];
    }
}

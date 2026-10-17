<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMenuItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'description' => ['sometimes', 'required', 'string', 'max:1000'],
            'category_id' => ['sometimes', 'required_without:category', 'integer', 'exists:menu_categories,id'],
            'category' => ['sometimes', 'required_without:category_id', 'string', Rule::exists('menu_categories', 'name')],
            'price' => ['sometimes', 'required', 'integer', 'min:0', 'max:1000000'],
            'image' => ['sometimes', 'required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'is_available' => ['sometimes', 'required', 'boolean'],
        ];
    }
}

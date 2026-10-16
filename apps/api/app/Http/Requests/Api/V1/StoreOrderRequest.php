<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $itemIds = array_column(config('restaurant.menu'), 'id');

        return [
            'items' => ['required', 'array', 'list', 'min:1', 'max:20'],
            'items.*' => ['required', 'array'],
            'items.*.item_id' => ['required', 'string', Rule::in($itemIds)],
            'items.*.quantity' => ['required', 'integer', 'between:1,20'],
        ];
    }
}

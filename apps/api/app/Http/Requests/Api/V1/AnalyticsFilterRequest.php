<?php

namespace App\Http\Requests\Api\V1;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class AnalyticsFilterRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'from' => $this->input('from', now('UTC')->subDays(6)->toDateString()),
            'to' => $this->input('to', now('UTC')->toDateString()),
        ]);
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $days = CarbonImmutable::parse($this->input('from'), 'UTC')->diffInDays(CarbonImmutable::parse($this->input('to'), 'UTC')) + 1;
            if ($days > 366) {
                $validator->errors()->add('to', 'The selected date range may not exceed 366 days.');
            }
        });
    }
}

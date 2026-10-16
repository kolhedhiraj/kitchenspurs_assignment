<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use JsonException;

class StoreEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'event_id' => ['required', 'uuid'],
            'event_name' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z][a-zA-Z0-9_.:-]*$/'],
            'event_type' => ['required', 'string', 'in:page_view,custom,business'],
            'application_id' => ['required', 'string', 'max:100'],
            'anonymous_id' => ['nullable', 'uuid'],
            'user_id' => ['nullable', 'string', 'max:128'],
            'occurred_at' => ['required', 'date'],
            'properties' => ['sometimes', 'nullable', 'array', 'max:100'],
            'context' => ['sometimes', 'nullable', 'array', 'max:32'],
            'context.path' => ['nullable', 'string', 'max:512'],
            'context.url' => ['nullable', 'string', 'max:2048'],
            'context.referrer' => ['nullable', 'string', 'max:2048'],
            'context.title' => ['nullable', 'string', 'max:255'],
            'context.user_agent' => ['nullable', 'string', 'max:1024'],
            'context.sdk_version' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $eventName = $this->input('event_name');
            $eventType = $this->input('event_type');
            if (is_string($eventName) && is_string($eventType)
                && (($eventName === 'page_view') !== ($eventType === 'page_view'))) {
                $validator->errors()->add('event_type', 'The page_view event name and event type must be used together.');
            }

            foreach (['properties', 'context'] as $field) {
                $value = $this->input($field);
                if (! is_array($value)) {
                    continue;
                }

                try {
                    $size = strlen(json_encode($value, JSON_THROW_ON_ERROR));
                } catch (JsonException) {
                    $validator->errors()->add($field, "The {$field} field must contain valid JSON data.");

                    continue;
                }

                if ($size > (int) config('analytics.ingestion.max_json_field_bytes', 16384)) {
                    $validator->errors()->add($field, "The {$field} field may not exceed 16 KB.");
                }
            }
        });
    }
}

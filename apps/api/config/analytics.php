<?php

return [
    'application_id' => env('ANALYTICS_APPLICATION_ID', 'restaurant-demo'),
    'ingestion' => [
        'browser_key' => env('BROWSER_INGESTION_KEY'),
        'server_key' => env('SERVER_INGESTION_KEY'),
        'max_payload_bytes' => 65536,
        'max_json_field_bytes' => 16384,
    ],
    'api_url' => env('ANALYTICS_API_URL', 'http://127.0.0.1:8000/api/v1/events'),
];

<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\IngestEvent;
use App\Http\Requests\Api\V1\StoreEventRequest;
use Illuminate\Http\JsonResponse;

class EventController
{
    public function store(StoreEventRequest $request, IngestEvent $ingestEvent): JsonResponse
    {
        $result = $ingestEvent->handle(
            $request->validated(),
            $request->attributes->get('ingestion_source'),
        );

        return response()->json($result, $result['duplicate'] ? 200 : 202);
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\BuildAnalyticsReport;
use App\Http\Requests\Api\V1\AnalyticsFilterRequest;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

class AnalyticsController
{
    public function overview(AnalyticsFilterRequest $request, BuildAnalyticsReport $report): JsonResponse
    {
        $filters = $request->validated();

        return response()->json($report->handle(
            CarbonImmutable::parse($filters['from'], 'UTC'),
            CarbonImmutable::parse($filters['to'], 'UTC'),
        ));
    }
}

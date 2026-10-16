<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LimitEventPayload
{
    public function handle(Request $request, Closure $next): Response
    {
        if (strlen($request->getContent()) > (int) config('analytics.ingestion.max_payload_bytes', 65536)) {
            return response()->json(['message' => 'The event payload may not exceed 64 KB.'], 413);
        }

        return $next($request);
    }
}

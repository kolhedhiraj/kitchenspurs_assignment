<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateIngestionCredential
{
    public function handle(Request $request, Closure $next): Response
    {
        $provided = $request->header('X-Analytics-Key');

        if (! is_string($provided) || $provided === '') {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        foreach ([
            'browser' => config('analytics.ingestion.browser_key'),
            'server' => config('analytics.ingestion.server_key'),
        ] as $source => $expected) {
            if (is_string($expected) && $expected !== '' && hash_equals($expected, $provided)) {
                $request->attributes->set('ingestion_source', $source);

                return $next($request);
            }
        }

        return response()->json(['message' => 'Unauthenticated.'], 401);
    }
}

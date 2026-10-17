<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateMenuManager
{
    public function handle(Request $request, Closure $next): Response
    {
        $configuredKey = config('restaurant.management_key');
        if (! is_string($configuredKey) || strlen($configuredKey) < 32) {
            return new JsonResponse(['message' => 'Menu management is not configured.'], 503);
        }

        $providedKey = $request->header('X-Menu-Management-Key');
        if (! is_string($providedKey) || ! hash_equals($configuredKey, $providedKey)) {
            return new JsonResponse(['message' => 'You are not authorized to manage the menu.'], 401);
        }

        return $next($request);
    }
}

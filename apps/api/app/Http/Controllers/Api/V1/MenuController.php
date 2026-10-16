<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;

class MenuController
{
    public function index(): JsonResponse
    {
        return response()->json([
            'currency' => config('restaurant.currency'),
            'items' => config('restaurant.menu'),
        ]);
    }
}

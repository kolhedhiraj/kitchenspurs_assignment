<?php

use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\EventController;
use App\Http\Controllers\Api\V1\MenuController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Middleware\AuthenticateIngestionCredential;
use App\Http\Middleware\LimitEventPayload;
use Illuminate\Support\Facades\Route;

Route::get('/v1/menu', [MenuController::class, 'index']);
Route::post('/v1/orders', [OrderController::class, 'store'])->middleware('throttle:30,1');
Route::post('/v1/events', [EventController::class, 'store'])
    ->middleware(['throttle:120,1', LimitEventPayload::class, AuthenticateIngestionCredential::class]);
Route::get('/v1/analytics/overview', [AnalyticsController::class, 'overview']);

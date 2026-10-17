<?php

use App\Http\Controllers\Api\V1\AdminMenuController;
use App\Http\Controllers\Api\V1\AdminCategoryController;
use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\EventController;
use App\Http\Controllers\Api\V1\MenuController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Middleware\AuthenticateIngestionCredential;
use App\Http\Middleware\AuthenticateMenuManager;
use App\Http\Middleware\LimitEventPayload;
use Illuminate\Support\Facades\Route;

Route::get('/v1/menu', [MenuController::class, 'index']);
Route::prefix('v1/admin/categories')->middleware(AuthenticateMenuManager::class)->group(function (): void {
    Route::get('/', [AdminCategoryController::class, 'index']);
    Route::post('/', [AdminCategoryController::class, 'store'])->middleware('throttle:30,1');
    Route::patch('/{category}', [AdminCategoryController::class, 'update'])->middleware('throttle:30,1');
    Route::delete('/{category}', [AdminCategoryController::class, 'destroy'])->middleware('throttle:30,1');
});
Route::prefix('v1/admin/menu-items')->middleware(AuthenticateMenuManager::class)->group(function (): void {
    Route::get('/', [AdminMenuController::class, 'index']);
    Route::post('/', [AdminMenuController::class, 'store'])->middleware('throttle:30,1');
    Route::get('/{menuItem}', [AdminMenuController::class, 'show']);
    Route::patch('/{menuItem}', [AdminMenuController::class, 'update'])->middleware('throttle:30,1');
    Route::delete('/{menuItem}', [AdminMenuController::class, 'destroy'])->middleware('throttle:30,1');
    Route::patch('/{menuItem}/availability', [AdminMenuController::class, 'updateAvailability'])->middleware('throttle:60,1');
});
Route::post('/v1/orders', [OrderController::class, 'store'])->middleware('throttle:30,1');
Route::get('/v1/orders', [OrderController::class, 'index']);
Route::get('/v1/orders/{order}', [OrderController::class, 'show'])->whereNumber('order');
Route::patch('/v1/orders/{order}/status', [OrderController::class, 'updateStatus'])->whereNumber('order')->middleware('throttle:60,1');
Route::post('/v1/events', [EventController::class, 'store'])
    ->middleware(['throttle:120,1', LimitEventPayload::class, AuthenticateIngestionCredential::class]);
Route::get('/v1/analytics/overview', [AnalyticsController::class, 'overview']);

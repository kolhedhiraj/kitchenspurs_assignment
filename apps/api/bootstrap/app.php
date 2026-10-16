<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(api: __DIR__.'/../routes/api.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {
        // Keep CORS and request handling on Laravel's standard API middleware stack.
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Laravel's default JSON validation and exception rendering is used for the API.
    })->create();

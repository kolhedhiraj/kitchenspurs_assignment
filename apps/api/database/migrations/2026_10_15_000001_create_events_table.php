<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table): void {
            $table->id();
            $table->uuid('event_id')->unique();
            $table->string('application_id', 100);
            $table->string('event_name', 100);
            $table->string('event_type', 32);
            $table->string('source', 16);
            $table->string('anonymous_id', 128)->nullable();
            $table->string('user_id', 128)->nullable();
            $table->string('path', 512)->nullable();
            $table->timestampTz('occurred_at');
            $table->timestampTz('received_at');
            $table->jsonb('properties')->nullable();
            $table->jsonb('context')->nullable();
            $table->timestamps();

            $table->index(['application_id', 'occurred_at']);
            $table->index(['application_id', 'event_name', 'occurred_at']);
            $table->index(['application_id', 'event_type', 'occurred_at']);
            $table->index(['application_id', 'anonymous_id']);
            $table->index(['application_id', 'path', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};

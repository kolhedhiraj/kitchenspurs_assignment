<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_items', function (Blueprint $table): void {
            $table->string('id', 100)->primary();
            $table->string('name', 120);
            $table->string('category', 80)->index();
            $table->text('description');
            $table->unsignedInteger('price');
            $table->string('image_path')->nullable();
            $table->boolean('is_available')->default(true)->index();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        $now = now('UTC');
        foreach (config('restaurant.menu', []) as $item) {
            DB::table('menu_items')->insert([
                'id' => $item['id'], 'name' => $item['name'], 'category' => $item['category'],
                'description' => $item['description'], 'price' => $item['price'],
                'image_path' => null, 'is_available' => true, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_items');
    }
};

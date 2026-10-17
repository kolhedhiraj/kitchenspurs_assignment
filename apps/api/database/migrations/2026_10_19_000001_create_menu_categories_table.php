<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 80)->unique();
            $table->timestampsTz();
        });

        $names = array_unique(array_merge(
            config('restaurant.categories', []),
            DB::table('menu_items')->distinct()->pluck('category')->all(),
        ));
        foreach ($names as $name) {
            DB::table('menu_categories')->insertOrIgnore(['name' => $name, 'created_at' => now('UTC'), 'updated_at' => now('UTC')]);
        }

        Schema::table('menu_items', function (Blueprint $table): void {
            $table->foreignId('category_id')->nullable()->constrained('menu_categories')->restrictOnDelete();
        });

        foreach (DB::table('menu_categories')->get(['id', 'name']) as $category) {
            DB::table('menu_items')->where('category', $category->name)->update(['category_id' => $category->id]);
        }

        Schema::table('menu_items', function (Blueprint $table): void {
            $table->dropIndex(['category']);
            $table->dropColumn('category');
        });
        DB::table('menu_items')->whereNull('category_id')->update(['category_id' => DB::table('menu_categories')->orderBy('id')->value('id')]);
        Schema::table('menu_items', function (Blueprint $table): void {
            $table->foreignId('category_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('menu_items', function (Blueprint $table): void {
            $table->string('category', 80)->nullable();
            $table->index('category');
        });
        foreach (DB::table('menu_categories')->get(['id', 'name']) as $category) {
            DB::table('menu_items')->where('category_id', $category->id)->update(['category' => $category->name]);
        }
        Schema::table('menu_items', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('category_id');
            $table->string('category', 80)->nullable(false)->change();
        });
        Schema::dropIfExists('menu_categories');
    }
};

<?php

namespace Tests\Feature;

use App\Models\MenuItem;
use App\Models\MenuCategory;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MenuManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('restaurant.management_key', 'menu-test-key-123456789012345678901234');
        Storage::fake('public');
    }

    public function test_public_menu_uses_database_and_exposes_availability_while_admin_listing_is_protected(): void
    {
        MenuItem::query()->whereKey('fries-classic')->update(['is_available' => false]);

        $this->getJson('/api/v1/menu')->assertOk()->assertJsonCount(5, 'items')
            ->assertJsonFragment(['id' => 'fries-classic', 'is_available' => false, 'category' => 'Sides'])
            ->assertJsonFragment(['name' => 'Pizza']);
        $this->getJson('/api/v1/admin/menu-items')->assertUnauthorized();
        $this->withHeader('X-Menu-Management-Key', 'menu-test-key-123456789012345678901234')->getJson('/api/v1/admin/menu-items')
            ->assertOk()->assertJsonCount(5, 'items');
    }

    public function test_manager_can_create_update_toggle_and_soft_delete_a_menu_item(): void
    {
        $headers = ['X-Menu-Management-Key' => 'menu-test-key-123456789012345678901234', 'Accept' => 'application/json'];
        $this->postJson('/api/v1/admin/menu-items', [])->assertUnauthorized();
        $created = $this->post('/api/v1/admin/menu-items', [
            'name' => 'Roasted Tomato Soup', 'description' => 'Slow-roasted tomatoes with basil cream.',
            'category' => 'Starters', 'price' => 189, 'is_available' => '1',
            'image' => UploadedFile::fake()->image('soup.webp', 640, 480),
        ], $headers)->assertCreated()->assertJsonPath('item.price', 189)->assertJsonPath('item.is_available', true);
        $id = $created->json('item.id');
        $item = MenuItem::query()->findOrFail($id);
        $originalImagePath = $item->image_path;
        Storage::disk('public')->assertExists($originalImagePath);

        $this->withHeaders($headers)->patchJson('/api/v1/admin/menu-items/'.$id.'/availability', ['is_available' => false])
            ->assertOk()->assertJsonPath('item.is_available', false);
        $this->getJson('/api/v1/menu')->assertJsonFragment(['id' => $id, 'is_available' => false]);
        $unavailableResponse = $this->postJson('/api/v1/orders', ['items' => [['item_id' => $id, 'quantity' => 1]]]);
        $unavailableResponse->assertUnprocessable()->assertSeeText("$item->name is currently unavailable.");

        $this->post('/api/v1/admin/menu-items/'.$id, ['_method' => 'PATCH', 'price' => 215, 'name' => $item->name, 'description' => $item->description, 'category_id' => $item->category_id, 'is_available' => '1'], $headers)
            ->assertOk()->assertJsonPath('item.price', 215);
        $this->assertSame($originalImagePath, MenuItem::query()->findOrFail($id)->image_path);
        $this->post('/api/v1/admin/menu-items/'.$id, ['_method' => 'PATCH', 'name' => $item->name, 'image' => UploadedFile::fake()->image('soup-revised.png')], $headers)
            ->assertOk();
        $updatedImagePath = MenuItem::query()->findOrFail($id)->image_path;
        Storage::disk('public')->assertExists($updatedImagePath);
        Storage::disk('public')->assertMissing($originalImagePath);

        $order = Order::query()->create(['total_amount' => 215, 'currency' => 'INR']);
        $order->items()->create(['item_id' => $id, 'name' => $item->name, 'unit_price' => 189, 'quantity' => 1, 'line_total' => 189]);
        $this->withHeaders($headers)->deleteJson('/api/v1/admin/menu-items/'.$id)->assertOk();
        $this->assertSoftDeleted('menu_items', ['id' => $id]);
        $this->assertDatabaseHas('order_items', ['order_id' => $order->id, 'name' => $item->name, 'unit_price' => 189]);
        $this->getJson('/api/v1/menu')->assertJsonMissing(['id' => $id]);
    }

    public function test_menu_item_validation_rejects_invalid_fields_and_images(): void
    {
        $this->withHeader('X-Menu-Management-Key', 'menu-test-key-123456789012345678901234')
            ->postJson('/api/v1/admin/menu-items', [
                'name' => '', 'description' => '', 'category_id' => 0, 'price' => -1,
                'is_available' => 'maybe',
            ])->assertUnprocessable()->assertJsonValidationErrors(['name', 'description', 'category_id', 'price', 'image', 'is_available']);

        $this->post('/api/v1/admin/menu-items', [
            'name' => 'Herbed Flatbread', 'description' => 'Warm flatbread with herbs.', 'category' => 'Starters',
            'price' => 150, 'is_available' => '1', 'image' => UploadedFile::fake()->create('notes.txt', 1, 'text/plain'),
        ], ['X-Menu-Management-Key' => 'menu-test-key-123456789012345678901234', 'Accept' => 'application/json'])
            ->assertUnprocessable()->assertJsonValidationErrors('image');
    }

    public function test_manager_can_manage_categories_and_cannot_delete_a_category_with_items(): void
    {
        $headers = ['X-Menu-Management-Key' => 'menu-test-key-123456789012345678901234', 'Accept' => 'application/json'];
        $this->withHeaders($headers)->getJson('/api/v1/admin/categories')->assertOk()->assertJsonFragment(['name' => 'Pizza']);
        $created = $this->withHeaders($headers)->postJson('/api/v1/admin/categories', ['name' => 'Seasonal'])->assertCreated();
        $categoryId = $created->json('category.id');
        $this->withHeaders($headers)->patchJson('/api/v1/admin/categories/'.$categoryId, ['name' => 'Seasonal Specials'])
            ->assertOk()->assertJsonPath('category.name', 'Seasonal Specials');
        $this->withHeaders($headers)->deleteJson('/api/v1/admin/categories/'.$categoryId)->assertOk();

        $usedCategoryId = MenuCategory::query()->where('name', 'Pizza')->value('id');
        $this->withHeaders($headers)->deleteJson('/api/v1/admin/categories/'.$usedCategoryId)
            ->assertStatus(409)->assertJsonPath('message', 'This category still contains menu items. Reassign those items before deleting the category.');
    }

    public function test_orders_use_database_prices_and_preserve_price_snapshots_after_menu_edits(): void
    {
        $menuItem = MenuItem::query()->findOrFail('pizza-margherita');
        $this->postJson('/api/v1/orders', ['items' => [['item_id' => $menuItem->id, 'quantity' => 1, 'price' => 1]]])
            ->assertCreated()->assertJsonPath('order.amount', $menuItem->price);
        $order = Order::query()->with('items')->firstOrFail();

        $menuItem->update(['price' => $menuItem->price + 100]);

        $this->assertSame($menuItem->price - 100, $order->items->first()->unit_price);
        $this->assertSame($menuItem->price - 100, $order->items->first()->line_total);
        $this->assertSame($menuItem->price - 100, $order->total_amount);
    }
}

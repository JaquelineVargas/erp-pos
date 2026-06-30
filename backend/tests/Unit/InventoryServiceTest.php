<?php

namespace Tests\Unit;

use App\DTOs\InventoryMovementDTO;
use App\Enums\MovementType;
use App\Models\Product;
use App\Models\User;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class InventoryServiceTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function register_movement_creates_record(): void
    {
        $product = Product::factory()->create(['stock' => 10]);
        $service = new InventoryService();

        $dto = new InventoryMovementDTO(
            product_id: $product->id,
            type: MovementType::ADJUSTMENT,
            quantity: 5,
            stock_before: 10,
            stock_after: 15,
        );

        $movement = $service->registerMovement($dto);

        $this->assertDatabaseHas('inventory_movements', [
            'id' => $movement->id,
            'product_id' => $product->id,
            'type' => MovementType::ADJUSTMENT->value,
        ]);
    }

    #[Test]
    public function adjust_stock_updates_product(): void
    {
        $product = Product::factory()->create(['stock' => 10]);
        $user = User::factory()->create();
        $service = new InventoryService();

        $updated = $service->adjustStock($product->id, 20, $user->id);

        $this->assertEquals(20, $updated->stock);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'type' => MovementType::ADJUSTMENT->value,
            'stock_before' => 10,
            'stock_after' => 20,
        ]);
    }

    #[Test]
    public function get_movements_returns_history(): void
    {
        $product = Product::factory()->create(['stock' => 10]);
        $user = User::factory()->create();
        $service = new InventoryService();

        $service->adjustStock($product->id, 15, $user->id, 'First adjustment');
        $service->adjustStock($product->id, 12, $user->id, 'Second adjustment');

        $movements = $service->getMovements($product->id);
        $this->assertCount(2, $movements);
    }
}

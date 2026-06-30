<?php

namespace Tests\Unit;

use App\DTOs\ArqueoDTO;
use App\Enums\ArqueoStatus;
use App\Enums\ArqueoMovementType;
use App\Models\Arqueo;
use App\Models\User;
use App\Services\ArqueoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ArqueoServiceTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function can_open_arqueo(): void
    {
        $user = User::factory()->create();
        $service = new ArqueoService();

        $dto = new ArqueoDTO(initial_amount: 500);
        $arqueo = $service->open($dto, $user->id);

        $this->assertDatabaseHas('arqueos', [
            'id' => $arqueo->id,
            'user_id' => $user->id,
            'initial_amount' => 500,
            'state' => ArqueoStatus::PENDING->value,
        ]);
    }

    #[Test]
    public function cannot_open_two_arqueos(): void
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Ya tienes un arqueo abierto');

        $user = User::factory()->create();
        $service = new ArqueoService();

        $dto = new ArqueoDTO(initial_amount: 500);
        $service->open($dto, $user->id);
        $service->open($dto, $user->id);
    }

    #[Test]
    public function close_arqueo_calculates_state_cuadrado(): void
    {
        $user = User::factory()->create();
        $service = new ArqueoService();

        $dto = new ArqueoDTO(initial_amount: 500);
        $arqueo = $service->open($dto, $user->id);

        $closeDto = new ArqueoDTO(
            initial_amount: 500,
            final_amount: 500,
        );
        $closed = $service->close($arqueo->id, $closeDto, $user->id);

        $this->assertEquals(ArqueoStatus::CUADRADO->value, $closed->state);
    }

    #[Test]
    public function close_arqueo_detects_sobrante(): void
    {
        $user = User::factory()->create();
        $service = new ArqueoService();

        $dto = new ArqueoDTO(initial_amount: 500);
        $arqueo = $service->open($dto, $user->id);

        $closeDto = new ArqueoDTO(
            initial_amount: 500,
            final_amount: 550,
        );
        $closed = $service->close($arqueo->id, $closeDto, $user->id);

        $this->assertEquals(ArqueoStatus::SOBRANTE->value, $closed->state);
    }

    #[Test]
    public function cannot_add_movement_to_closed_arqueo(): void
    {
        $this->expectException(\Exception::class);

        $user = User::factory()->create();
        $service = new ArqueoService();

        $dto = new ArqueoDTO(initial_amount: 500);
        $arqueo = $service->open($dto, $user->id);

        $closeDto = new ArqueoDTO(initial_amount: 500, final_amount: 500);
        $service->close($arqueo->id, $closeDto, $user->id);

        $service->addMovement($arqueo->id, ArqueoMovementType::MANUAL_INCOME, 100);
    }

    #[Test]
    public function get_active_arqueo_returns_null_when_none(): void
    {
        $user = User::factory()->create();
        $service = new ArqueoService();

        $active = $service->getActiveArqueo($user->id);
        $this->assertNull($active);
    }
}

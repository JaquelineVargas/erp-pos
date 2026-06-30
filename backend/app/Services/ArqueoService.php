<?php

namespace App\Services;

use App\DTOs\ArqueoDTO;
use App\Enums\ArqueoMovementType;
use App\Enums\ArqueoStatus;
use App\Enums\PaymentMethod;
use App\Models\Arqueo;
use App\Models\ArqueoMovement;
use App\Models\Sale;
use Exception;

class ArqueoService
{
    public function open(ArqueoDTO $dto, int $userId): Arqueo
    {
        $this->ensureNoOpenArqueo($userId);

        return Arqueo::create([
            'user_id' => $userId,
            'initial_amount' => $dto->initial_amount,
            'state' => ArqueoStatus::PENDING->value,
            'opened_at' => DateUtils::nowUTC(),
        ]);
    }

    public function close(int $arqueoId, ArqueoDTO $dto, int $closedBy): Arqueo
    {
        $arqueo = Arqueo::findOrFail($arqueoId);

        if ($arqueo->state !== ArqueoStatus::PENDING->value) {
            throw new Exception('El arqueo ya está cerrado.');
        }

        $sales = Sale::where('arqueo_id', $arqueoId)
            ->where('status', '!=', 'void')
            ->get();

        $cashSales = 0;
        $cardSales = 0;
        $transferSales = 0;
        $qrSales = 0;

        foreach ($sales as $sale) {
            $method = $sale->payment_method;
            $total = (float) $sale->total;
            match($method) {
                'cash' => $cashSales += $total,
                'card' => $cardSales += $total,
                'transfer' => $transferSales += $total,
                'qr' => $qrSales += $total,
                default => null,
            };
        }

        $manualIncome = (float) ArqueoMovement::where('arqueo_id', $arqueoId)
            ->where('type', ArqueoMovementType::MANUAL_INCOME->value)->sum('amount');
        $expenses = (float) ArqueoMovement::where('arqueo_id', $arqueoId)
            ->where('type', ArqueoMovementType::EXPENSE->value)->sum('amount');
        $returns = (float) ArqueoMovement::where('arqueo_id', $arqueoId)
            ->where('type', ArqueoMovementType::RETURN->value)->sum('amount');
        $voids = (float) ArqueoMovement::where('arqueo_id', $arqueoId)
            ->where('type', ArqueoMovementType::VOID->value)->sum('amount');

        $arqueo->cash_sales = $cashSales;
        $arqueo->card_sales = $cardSales;
        $arqueo->transfer_sales = $transferSales;
        $arqueo->qr_sales = $qrSales;
        $arqueo->manual_income = $dto->manual_income ?? $manualIncome;
        $arqueo->expenses = $dto->expenses ?? $expenses;
        $arqueo->return_total = $dto->return_total ?? $returns;
        $arqueo->void_total = $dto->void_total ?? $voids;
        $arqueo->total_sales_count = $sales->count();
        $arqueo->final_amount = $dto->final_amount;
        $arqueo->notes = $dto->notes;
        $arqueo->coin_breakdown = $dto->coin_breakdown;
        $arqueo->closed_by = $closedBy;
        $arqueo->closed_at = DateUtils::nowUTC();

        $arqueo->expected_cash = $arqueo->calculateExpectedCash();
        $diff = (float) ($dto->final_amount ?? 0) - $arqueo->expected_cash;
        $arqueo->cash_difference = round($diff, 2);
        $arqueo->state = $arqueo->determineState()->value;

        $arqueo->save();
        return $arqueo->fresh();
    }

    public function addMovement(int $arqueoId, ArqueoMovementType $type, float $amount, ?string $description = null, ?int $saleId = null): ArqueoMovement
    {
        $arqueo = Arqueo::findOrFail($arqueoId);

        if ($arqueo->state !== ArqueoStatus::PENDING->value) {
            throw new Exception('No se pueden agregar movimientos a un arqueo cerrado.');
        }

        $paymentMethod = match($type) {
            ArqueoMovementType::CASH_SALE => PaymentMethod::CASH->value,
            ArqueoMovementType::CARD_SALE => PaymentMethod::CARD->value,
            ArqueoMovementType::TRANSFER_SALE => PaymentMethod::TRANSFER->value,
            ArqueoMovementType::QR_SALE => PaymentMethod::QR->value,
            default => null,
        };

        return ArqueoMovement::create([
            'arqueo_id' => $arqueoId,
            'type' => $type->value,
            'payment_method' => $paymentMethod,
            'sale_id' => $saleId,
            'description' => $description,
            'amount' => $amount,
        ]);
    }

    public function getActiveArqueo(int $userId): ?Arqueo
    {
        return Arqueo::where('user_id', $userId)
            ->where('state', ArqueoStatus::PENDING->value)
            ->latest('opened_at')
            ->first();
    }

    public function summary(int $arqueoId): array
    {
        $arqueo = Arqueo::with(['movements'])->findOrFail($arqueoId);

        return [
            'id' => $arqueo->id,
            'state' => $arqueo->state,
            'state_label' => ArqueoStatus::tryFrom($arqueo->state)?->label() ?? $arqueo->state,
            'initial_amount' => $arqueo->initial_amount,
            'expected_cash' => $arqueo->expected_cash,
            'final_amount' => $arqueo->final_amount,
            'cash_difference' => $arqueo->cash_difference,
            'breakdown' => [
                'cash_sales' => $arqueo->cash_sales,
                'card_sales' => $arqueo->card_sales,
                'transfer_sales' => $arqueo->transfer_sales,
                'qr_sales' => $arqueo->qr_sales,
                'manual_income' => $arqueo->manual_income,
                'expenses' => $arqueo->expenses,
                'returns' => $arqueo->return_total,
                'voids' => $arqueo->void_total,
            ],
            'total_sales_count' => $arqueo->total_sales_count,
            'opened_at' => $arqueo->opened_at,
            'closed_at' => $arqueo->closed_at,
            'user' => $arqueo->user?->only(['id', 'name']),
        ];
    }

    private function ensureNoOpenArqueo(int $userId): void
    {
        $open = Arqueo::where('user_id', $userId)
            ->where('state', ArqueoStatus::PENDING->value)
            ->exists();

        if ($open) {
            throw new Exception('Ya tienes un arqueo abierto. Ciérralo antes de abrir uno nuevo.');
        }
    }
}

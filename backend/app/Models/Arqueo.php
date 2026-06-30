<?php

namespace App\Models;

use App\Enums\ArqueoStatus;
use App\Enums\PaymentMethod;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Arqueo extends Model
{
    protected $fillable = [
        'user_id',
        'initial_amount',
        'final_amount',
        'expected_cash',
        'cash_difference',
        'state',
        'cash_sales',
        'card_sales',
        'transfer_sales',
        'qr_sales',
        'manual_income',
        'expenses',
        'return_total',
        'void_total',
        'total_sales_count',
        'opened_at',
        'closed_at',
        'closed_by',
        'notes',
        'coin_breakdown',
    ];

    protected function casts(): array
    {
        return [
            'initial_amount' => 'decimal:2',
            'final_amount' => 'decimal:2',
            'expected_cash' => 'decimal:2',
            'cash_difference' => 'decimal:2',
            'cash_sales' => 'decimal:2',
            'card_sales' => 'decimal:2',
            'transfer_sales' => 'decimal:2',
            'qr_sales' => 'decimal:2',
            'manual_income' => 'decimal:2',
            'expenses' => 'decimal:2',
            'return_total' => 'decimal:2',
            'void_total' => 'decimal:2',
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
            'coin_breakdown' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(ArqueoMovement::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function calculateExpectedCash(): float
    {
        return $this->initial_amount + $this->cash_sales + $this->manual_income - $this->expenses - $this->return_total;
    }

    public function determineState(): ArqueoStatus
    {
        $expected = $this->calculateExpectedCash();
        $actual = $this->final_amount ?? 0;
        $diff = $actual - $expected;

        return match(true) {
            abs($diff) < 0.01 => ArqueoStatus::CUADRADO,
            $diff > 0 => ArqueoStatus::SOBRANTE,
            default => ArqueoStatus::FALTANTE,
        };
    }

    public function totalSalesByPaymentMethod(PaymentMethod $method): float
    {
        return match($method) {
            PaymentMethod::CASH => $this->cash_sales,
            PaymentMethod::CARD => $this->card_sales,
            PaymentMethod::TRANSFER => $this->transfer_sales,
            PaymentMethod::QR => $this->qr_sales,
        };
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashRegister extends Model
{
    protected $fillable = [
        'user_id', 'initial_amount', 'final_amount', 'expected_amount', 'difference',
        'total_sales', 'sales_count', 'payment_methods_breakdown',
        'status', 'opened_at', 'closed_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
            'initial_amount' => 'decimal:2',
            'final_amount' => 'decimal:2',
            'expected_amount' => 'decimal:2',
            'difference' => 'decimal:2',
            'total_sales' => 'decimal:2',
            'payment_methods_breakdown' => 'array',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function movements()
    {
        return $this->hasMany(CashMovement::class);
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }
}

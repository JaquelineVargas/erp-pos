<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArqueoMovement extends Model
{
    protected $fillable = [
        'arqueo_id',
        'type',
        'payment_method',
        'sale_id',
        'description',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function arqueo(): BelongsTo
    {
        return $this->belongsTo(Arqueo::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}

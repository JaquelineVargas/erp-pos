<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductBatch extends Model
{
    protected $fillable = [
        'product_id', 'batch_code', 'expiration_date',
        'current_quantity', 'unit_cost', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'expiration_date' => 'date:Y-m-d',
            'current_quantity' => 'decimal:3',
            'unit_cost' => 'decimal:2',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function movements()
    {
        return $this->hasMany(InventoryMovement::class, 'batch_id');
    }
}

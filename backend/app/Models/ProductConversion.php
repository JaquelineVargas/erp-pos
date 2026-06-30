<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductConversion extends Model
{
    protected $fillable = [
        'product_id', 'name', 'factor',
        'is_purchase_unit', 'is_sale_unit',
    ];

    protected function casts(): array
    {
        return [
            'factor' => 'decimal:4',
            'is_purchase_unit' => 'boolean',
            'is_sale_unit' => 'boolean',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'internal_code', 'sku', 'barcode', 'name', 'brand', 'description',
        'category_id', 'inventory_type', 'base_unit',
        'purchase_price', 'selling_price',
        'current_stock', 'min_stock',
        'track_stock', 'track_batches', 'track_expiration',
        'track_conversions',
        'batch_generation', 'expiration_alert_days',
        'is_active', 'image',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'track_stock' => 'boolean',
            'track_batches' => 'boolean',
            'track_expiration' => 'boolean',
            'track_conversions' => 'boolean',
            'purchase_price' => 'decimal:2',
            'selling_price' => 'decimal:2',

            'current_stock' => 'decimal:3',
            'min_stock' => 'decimal:3',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($product) {
            if (!$product->internal_code) {
                $max = static::max('id') ?? 0;
                $product->internal_code = 'PROD-' . str_pad($max + 1, 5, '0', STR_PAD_LEFT);
            }
            static::syncBaseUnit($product);
            if ($product->track_expiration) {
                $product->track_batches = true;
            }
        });

        static::updating(function ($product) {
            static::syncBaseUnit($product);
            if ($product->track_expiration) {
                $product->track_batches = true;
            }
        });
    }

    protected static function syncBaseUnit($product): void
    {
        if (!$product->isDirty('inventory_type') && $product->base_unit) {
            return;
        }
        $product->base_unit = match ($product->inventory_type) {
            'weight' => 'kg',
            'volume' => 'L',
            default => 'ud.',
        };
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class, 'product_id');
    }

    public function batches()
    {
        return $this->hasMany(ProductBatch::class);
    }

    public function inventoryMovements()
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function conversions()
    {
        return $this->hasMany(ProductConversion::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeLowStock($query)
    {
        return $query->where('track_stock', true)
            ->whereColumn('current_stock', '<=', 'min_stock');
    }

    public function getIsLowStockAttribute(): bool
    {
        return $this->track_stock && $this->current_stock <= $this->min_stock;
    }

    public function getIsWeightOrVolumeAttribute(): bool
    {
        return in_array($this->inventory_type, ['weight', 'volume']);
    }
}

<?php

namespace App\DTOs;

use App\Models\Product;

class SaleItemDTO
{
    public function __construct(
        public readonly int $product_id,
        public readonly string $product_name,
        public readonly int $quantity,
        public readonly float $unit_price,
        public readonly float $subtotal,
        public readonly ?float $cost = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            product_id: (int) $data['product_id'],
            product_name: $data['product_name'] ?? '',
            quantity: (int) $data['quantity'],
            unit_price: (float) $data['unit_price'],
            subtotal: (float) $data['subtotal'],
            cost: isset($data['cost']) ? (float) $data['cost'] : null,
        );
    }

    public function toArray(): array
    {
        return [
            'product_id' => $this->product_id,
            'product_name' => $this->product_name,
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'subtotal' => $this->subtotal,
            'cost' => $this->cost,
        ];
    }
}

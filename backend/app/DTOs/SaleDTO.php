<?php

namespace App\DTOs;

use App\Enums\PaymentMethod;

class SaleDTO
{
    /**
     * @param SaleItemDTO[] $items
     */
    public function __construct(
        public readonly array $items,
        public readonly float $subtotal,
        public readonly float $discount,
        public readonly float $total,
        public readonly PaymentMethod $payment_method,
        public readonly ?int $user_id = null,
        public readonly ?int $customer_id = null,
    ) {}

    public static function fromRequest(array $data): self
    {
        $items = array_map(fn(array $item) => SaleItemDTO::fromArray($item), $data['items'] ?? []);

        return new self(
            items: $items,
            subtotal: (float) ($data['subtotal'] ?? 0),
            discount: (float) ($data['discount'] ?? 0),
            total: (float) ($data['total'] ?? 0),
            payment_method: PaymentMethod::from($data['payment_method'] ?? 'cash'),
            user_id: isset($data['user_id']) ? (int) $data['user_id'] : null,
            customer_id: isset($data['customer_id']) ? (int) $data['customer_id'] : null,
        );
    }

    public function toArray(): array
    {
        return [
            'items' => array_map(fn(SaleItemDTO $i) => $i->toArray(), $this->items),
            'subtotal' => $this->subtotal,
            'discount' => $this->discount,
            'total' => $this->total,
            'payment_method' => $this->payment_method->value,
            'user_id' => $this->user_id,
            'customer_id' => $this->customer_id,
        ];
    }
}

<?php

namespace App\DTOs;

class ArqueoDTO
{
    public function __construct(
        public readonly float $initial_amount,
        public readonly ?float $cash_sales = null,
        public readonly ?float $card_sales = null,
        public readonly ?float $transfer_sales = null,
        public readonly ?float $qr_sales = null,
        public readonly ?float $manual_income = null,
        public readonly ?float $expenses = null,
        public readonly ?float $return_total = null,
        public readonly ?float $void_total = null,
        public readonly ?int $total_sales_count = null,
        public readonly ?float $final_amount = null,
        public readonly ?string $notes = null,
        public readonly ?array $coin_breakdown = null,
        public readonly ?int $closed_by = null,
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            initial_amount: (float) ($data['initial_amount'] ?? 0),
            cash_sales: isset($data['cash_sales']) ? (float) $data['cash_sales'] : null,
            card_sales: isset($data['card_sales']) ? (float) $data['card_sales'] : null,
            transfer_sales: isset($data['transfer_sales']) ? (float) $data['transfer_sales'] : null,
            qr_sales: isset($data['qr_sales']) ? (float) $data['qr_sales'] : null,
            manual_income: isset($data['manual_income']) ? (float) $data['manual_income'] : null,
            expenses: isset($data['expenses']) ? (float) $data['expenses'] : null,
            return_total: isset($data['return_total']) ? (float) $data['return_total'] : null,
            void_total: isset($data['void_total']) ? (float) $data['void_total'] : null,
            total_sales_count: isset($data['total_sales_count']) ? (int) $data['total_sales_count'] : null,
            final_amount: isset($data['final_amount']) ? (float) $data['final_amount'] : null,
            notes: $data['notes'] ?? null,
            coin_breakdown: $data['coin_breakdown'] ?? null,
            closed_by: isset($data['closed_by']) ? (int) $data['closed_by'] : null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'initial_amount' => $this->initial_amount,
            'cash_sales' => $this->cash_sales,
            'card_sales' => $this->card_sales,
            'transfer_sales' => $this->transfer_sales,
            'qr_sales' => $this->qr_sales,
            'manual_income' => $this->manual_income,
            'expenses' => $this->expenses,
            'return_total' => $this->return_total,
            'void_total' => $this->void_total,
            'total_sales_count' => $this->total_sales_count,
            'final_amount' => $this->final_amount,
            'notes' => $this->notes,
            'coin_breakdown' => $this->coin_breakdown,
            'closed_by' => $this->closed_by,
        ], fn($v) => !is_null($v));
    }
}

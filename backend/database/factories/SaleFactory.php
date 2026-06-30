<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class SaleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'folio' => 'VEN-' . fake()->unique()->randomNumber(6),
            'subtotal' => fake()->randomFloat(2, 10, 1000),
            'tax' => 0,
            'total' => fake()->randomFloat(2, 10, 1000),
            'payment_method' => fake()->randomElement(['cash', 'card', 'transfer']),
            'status' => 'completed',
        ];
    }
}

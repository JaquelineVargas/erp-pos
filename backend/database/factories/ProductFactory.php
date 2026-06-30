<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->word(),
            'price' => fake()->randomFloat(2, 10, 500),
            'cost' => fake()->randomFloat(2, 5, 200),
            'stock' => fake()->numberBetween(0, 100),
            'min_stock' => 5,
            'is_active' => true,
        ];
    }
}

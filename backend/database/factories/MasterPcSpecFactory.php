<?php

namespace Database\Factories;

use App\Models\MasterPcSpec;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MasterPcSpec>
 */
class MasterPcSpecFactory extends Factory
{
    protected $model = MasterPcSpec::class;

    public function definition(): array
    {
        return [
            'ram_gb' => fake()->randomElement([4, 8, 16, 32]),
            'storage_gb' => fake()->randomElement([256, 512, 1024]),
            'storage_type' => fake()->randomElement(['SSD', 'HDD']),
            'cpu' => 'Intel Core i5',
            'standby_watt' => fake()->randomFloat(2, 50, 150),
            'is_active' => true,
        ];
    }
}

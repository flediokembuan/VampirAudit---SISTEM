<?php

namespace Database\Factories;

use App\Models\LabRoom;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LabRoom>
 */
class LabRoomFactory extends Factory
{
    protected $model = LabRoom::class;

    public function definition(): array
    {
        return [
            'name' => 'Lab ' . fake()->unique()->word(),
            'location' => 'Gedung ' . fake()->randomElement(['A', 'B', 'C', 'D']),
            'capacity' => fake()->numberBetween(20, 40),
            'standby_hours_per_day' => 16.0,
            'standby_days_per_month' => 22.0,
            'is_active' => true,
        ];
    }
}

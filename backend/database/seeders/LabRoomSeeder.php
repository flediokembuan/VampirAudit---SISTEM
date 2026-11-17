<?php

namespace Database\Seeders;

use App\Models\LabRoom;
use Illuminate\Database\Seeder;

class LabRoomSeeder extends Seeder
{
    public function run(): void
    {
        $labs = [
            ['name' => 'Lab 1 Komputer Dasar', 'location' => 'GK1-301 • LT. 3', 'capacity' => 40],
            ['name' => 'Lab 2 Rekayasa Perangkat Lunak', 'location' => 'GK1-302 • LT. 3', 'capacity' => 40],
            ['name' => 'Lab 3 Jaringan & Keamanan', 'location' => 'GK1-303 • LT. 3', 'capacity' => 40],
            ['name' => 'Lab 4 AI & Data Science', 'location' => 'GK1-304 • LT. 3', 'capacity' => 40],
            ['name' => 'Lab 5 Multimedia & Desain', 'location' => 'GK1-305 • LT. 3', 'capacity' => 40],
            ['name' => 'Lab 6 Riset & Inovasi', 'location' => 'GK1-306 • LT. 3', 'capacity' => 40],
        ];

        foreach ($labs as $lab) {
            LabRoom::query()->updateOrCreate(
                ['name' => $lab['name']],
                [...$lab, 'is_active' => true]
            );
        }
    }
}

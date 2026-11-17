<?php

namespace Database\Seeders;

use App\Models\MasterPcSpec;
use Illuminate\Database\Seeder;

class MasterPcSpecSeeder extends Seeder
{
    public function run(): void
    {
        $specs = [
            ['ram_gb' => 16, 'storage_gb' => 512, 'storage_type' => 'SSD', 'cpu' => 'Intel Core i5-12400', 'standby_watt' => 3.80],
            ['ram_gb' => 16, 'storage_gb' => 256, 'storage_type' => 'SSD', 'cpu' => 'Intel Core i5-11400', 'standby_watt' => 3.90],
            ['ram_gb' => 32, 'storage_gb' => 1000, 'storage_type' => 'NVME', 'cpu' => 'AMD Ryzen 7 5700X', 'standby_watt' => 4.20],
            ['ram_gb' => 32, 'storage_gb' => 512, 'storage_type' => 'SSD', 'cpu' => 'Intel Core i7-11700 Dual NIC', 'standby_watt' => 14.20],
            ['ram_gb' => 64, 'storage_gb' => 1000, 'storage_type' => 'NVME', 'cpu' => 'RTX 4070 • Core i7-13700KF', 'standby_watt' => 4.50],
            ['ram_gb' => 16, 'storage_gb' => 512, 'storage_type' => 'NVME', 'cpu' => 'Apple M2 Mac Mini', 'standby_watt' => 1.80],
            ['ram_gb' => 8, 'storage_gb' => 256, 'storage_type' => 'SSD', 'cpu' => 'Intel Core i5-10400', 'standby_watt' => 2.20],
            ['ram_gb' => 8, 'storage_gb' => 512, 'storage_type' => 'SSD', 'cpu' => 'Intel Core i5-10400', 'standby_watt' => 6.90],
        ];

        foreach ($specs as $spec) {
            MasterPcSpec::query()->updateOrCreate(
                [
                    'ram_gb' => $spec['ram_gb'],
                    'storage_gb' => $spec['storage_gb'],
                    'storage_type' => $spec['storage_type'],
                ],
                [...$spec, 'is_active' => true]
            );
        }
    }
}

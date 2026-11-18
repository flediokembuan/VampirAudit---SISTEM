<?php

namespace Database\Factories;

use App\Models\AuditPcLog;
use App\Models\LabRoom;
use App\Models\MasterPcSpec;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditPcLog>
 */
class AuditPcLogFactory extends Factory
{
    protected $model = AuditPcLog::class;

    public function definition(): array
    {
        return [
            'lab_room_id' => LabRoom::factory(),
            'pc_number' => 'PC-' . fake()->unique()->numberBetween(1, 100),
            'master_pc_spec_id' => MasterPcSpec::factory(),
            'ram_gb_snapshot' => 16,
            'storage_gb_snapshot' => 512,
            'storage_type_snapshot' => 'SSD',
            'cpu_snapshot' => 'Intel Core i5',
            'standby_watt_snapshot' => 65.0,
            'is_faulty' => false,
            'fault_note' => null,
            'audited_by' => User::factory(),
            'audited_at' => now(),
        ];
    }
}

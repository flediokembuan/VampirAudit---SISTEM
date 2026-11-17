<?php

namespace Database\Seeders;

use App\Models\AuditPcLog;
use App\Models\LabRoom;
use App\Models\MasterPcSpec;
use App\Models\User;
use Illuminate\Database\Seeder;

class AuditSeeder extends Seeder
{
    public function run(): void
    {
        $specs = MasterPcSpec::query()->orderBy('id')->get();
        $auditors = User::query()
            ->whereIn('email', ['auditor@unklab.ac.id', 'auditor2@unklab.ac.id', 'juan.auditor@unklab.ac.id'])
            ->orderBy('id')
            ->get();

        // 205 audited PCs across 6 labs (total capacity 240 -> 85.4%)
        // Standby watt sums per lab: 115 + 210 + 420 + 185 + 190 + 120 = 1240 W
        $labPlans = [
            'Lab 1 Komputer Dasar' => $this->buildLab1Plan(),
            'Lab 2 Rekayasa Perangkat Lunak' => $this->buildLab2Plan(),
            'Lab 3 Jaringan & Keamanan' => $this->buildLab3Plan(),
            'Lab 4 AI & Data Science' => $this->buildUniformPlan(39, 14, 7.40, 2),
            'Lab 5 Multimedia & Desain' => $this->buildUniformPlan(32, 12, 9.50, 4),
            'Lab 6 Riset & Inovasi' => $this->buildUniformPlan(30, 10, 6.00, 1),
        ];

        foreach ($labPlans as $labName => $entries) {
            $lab = LabRoom::query()->where('name', $labName)->firstOrFail();

            foreach ($entries as $index => $entry) {
                $spec = $specs[$entry['spec_index'] % $specs->count()];
                $auditor = $auditors[$index % $auditors->count()];
                $auditedAt = now()->subHours(count($entries) - $index)->setMinute(($index * 7) % 60);

                AuditPcLog::query()->updateOrCreate(
                    ['lab_room_id' => $lab->id, 'pc_number' => $entry['pc_number']],
                    [
                        'master_pc_spec_id' => $spec->id,
                        'ram_gb_snapshot' => $spec->ram_gb,
                        'storage_gb_snapshot' => $spec->storage_gb,
                        'storage_type_snapshot' => $spec->storage_type,
                        'cpu_snapshot' => $spec->cpu,
                        'standby_watt_snapshot' => $entry['watt'],
                        'is_faulty' => $entry['faulty'],
                        'fault_note' => $entry['note'],
                        'audited_by' => $auditor->id,
                        'audited_at' => $auditedAt,
                    ]
                );
            }
        }
    }

    /**
     * 40 units -> total 115.00 W
     * 18 off (0W), 2 faulty (PC-11, PC-29 @ 14.20W = 28.40W), 3 standby (8.00W = 24.00W), 17 normal (62.60W)
     */
    private function buildLab1Plan(): array
    {
        $entries = [];
        $normalIndex = 0;

        for ($i = 1; $i <= 40; $i++) {
            $pc = sprintf('PC-%02d', $i);

            if ($i === 11 || $i === 29) {
                $entries[] = [
                    'pc_number' => $pc,
                    'spec_index' => 0,
                    'watt' => 14.20,
                    'faulty' => true,
                    'note' => 'Terdeteksi arus bocor saat kabel digerakkan, isolasi kabel luar robek dekat steker MCB meja.',
                ];

                continue;
            }

            if (in_array($i, [7, 18, 26], true)) {
                $entries[] = [
                    'pc_number' => $pc,
                    'spec_index' => 7,
                    'watt' => 8.00,
                    'faulty' => false,
                    'note' => null,
                ];

                continue;
            }

            if (in_array($i, [3, 6, 12, 21, 23], true) || $i > 28) {
                $normalIndex++;
                $watt = $normalIndex === 17 ? 1.80 : 3.80;
                $entries[] = [
                    'pc_number' => $pc,
                    'spec_index' => 0,
                    'watt' => $watt,
                    'faulty' => false,
                    'note' => null,
                ];

                continue;
            }

            $entries[] = [
                'pc_number' => $pc,
                'spec_index' => 0,
                'watt' => 0.00,
                'faulty' => false,
                'note' => null,
            ];
        }

        return $entries;
    }

    /**
     * 38 units -> total 210.00 W
     * 10 off (0W), 6 standby (10.00W = 60.00W), 22 normal/high standby (21*6.90 + 5.10 = 150.00W)
     */
    private function buildLab2Plan(): array
    {
        $entries = [];

        for ($i = 1; $i <= 38; $i++) {
            $pc = sprintf('PC-%02d', $i);

            if ($i <= 10) {
                $watt = 0.00;
            } elseif ($i <= 16) {
                $watt = 10.00;
            } elseif ($i === 38) {
                $watt = 5.10;
            } else {
                $watt = 6.90;
            }

            $entries[] = [
                'pc_number' => $pc,
                'spec_index' => 2,
                'watt' => $watt,
                'faulty' => false,
                'note' => null,
            ];
        }

        return $entries;
    }

    /**
     * 26 units (PC-01..PC-25 + PC-29) -> total 420.00 W
     * 2 faulty (PC-11, PC-29 @ 24.20W = 48.40W), 14 standby (@ 20.00W = 280.00W), 10 normal (@ 9.16W = 91.60W)
     */
    private function buildLab3Plan(): array
    {
        $pcNumbers = array_merge(range(1, 25), [29]);
        $entries = [];

        foreach ($pcNumbers as $idx => $num) {
            $pc = sprintf('PC-%02d', $num);

            if ($num === 11 || $num === 29) {
                $entries[] = [
                    'pc_number' => $pc,
                    'spec_index' => 3,
                    'watt' => 24.20,
                    'faulty' => true,
                    'note' => 'Anomali PSU & kabel power terkelupas; stopkontak goyang memicu lonjakan watt.',
                ];

                continue;
            }

            if ($idx < 14) {
                $entries[] = [
                    'pc_number' => $pc,
                    'spec_index' => 3,
                    'watt' => 20.00,
                    'faulty' => false,
                    'note' => null,
                ];

                continue;
            }

            $entries[] = [
                'pc_number' => $pc,
                'spec_index' => 3,
                'watt' => 9.16,
                'faulty' => false,
                'note' => null,
            ];
        }

        return $entries;
    }

    private function buildUniformPlan(int $total, int $offCount, float $activeWatt, int $specIndex): array
    {
        $entries = [];

        for ($i = 1; $i <= $total; $i++) {
            $entries[] = [
                'pc_number' => sprintf('PC-%02d', $i),
                'spec_index' => $specIndex,
                'watt' => $i <= $offCount ? 0.00 : $activeWatt,
                'faulty' => false,
                'note' => null,
            ];
        }

        return $entries;
    }
}

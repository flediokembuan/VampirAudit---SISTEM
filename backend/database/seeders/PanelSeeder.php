<?php

namespace Database\Seeders;

use App\Enums\PanelGroup;
use App\Models\LabRoom;
use App\Models\PanelLimit;
use App\Models\PanelReading;
use App\Models\User;
use Illuminate\Database\Seeder;

class PanelSeeder extends Seeder
{
    public function run(): void
    {
        $maintenance = User::query()->where('email', 'maintenance@unklab.ac.id')->firstOrFail();

        foreach (LabRoom::query()->orderBy('id')->get() as $lab) {
            foreach ([[PanelGroup::SOCKET, 10], [PanelGroup::AC, 40]] as [$group, $ampere]) {
                PanelLimit::query()->updateOrCreate(
                    ['lab_room_id' => $lab->id, 'group_type' => $group],
                    [
                        'limit_ampere' => $ampere,
                        'voltage' => 220,
                        'warning_percent' => 80,
                    ]
                );
            }
        }

        $readings = [
            ['Lab 1 Komputer Dasar', PanelGroup::SOCKET, 1316, 'MANUAL_MEASUREMENT', 'Beban meja PC normal (59.8% MCB 10A).'],
            ['Lab 1 Komputer Dasar', PanelGroup::AC, 3715, 'MANUAL_MEASUREMENT', '4 unit split AC beroperasi normal (42.2% MCB 40A).'],
            ['Lab 2 Rekayasa Perangkat Lunak', PanelGroup::SOCKET, 1507, 'MANUAL_MEASUREMENT', 'Beban praktikum RPL normal (68.5% MCB 10A).'],
            ['Lab 2 Rekayasa Perangkat Lunak', PanelGroup::AC, 3960, 'MANUAL_MEASUREMENT', 'Pengukuran panel AC stabil (45.0% MCB 40A).'],
            ['Lab 3 Jaringan & Keamanan', PanelGroup::SOCKET, 1936, 'MANUAL_MEASUREMENT', 'Beban tinggi mendekati batas trip MCB 10A (88.0%).'],
            ['Lab 3 Jaringan & Keamanan', PanelGroup::AC, 3988, 'MANUAL_MEASUREMENT', 'Beban grup AC terukur aman (45.3% MCB 40A).'],
            ['Lab 4 AI & Data Science', PanelGroup::SOCKET, 1720, 'MANUAL_ESTIMATE', 'Workstation GPU aktif (78.2% MCB 10A).'],
            ['Lab 4 AI & Data Science', PanelGroup::AC, 4206, 'MANUAL_ESTIMATE', 'Beban AC ruangan terjaga (47.8% MCB 40A).'],
            ['Lab 5 Multimedia & Desain', PanelGroup::SOCKET, 1130, 'MANUAL_ESTIMATE', 'Pemakaian stopkontak normal (51.4% MCB 10A).'],
            ['Lab 5 Multimedia & Desain', PanelGroup::AC, 3608, 'MANUAL_ESTIMATE', 'Beban pendingin normal (41.0% MCB 40A).'],
            ['Lab 6 Riset & Inovasi', PanelGroup::SOCKET, 970, 'MANUAL_ESTIMATE', 'Beban meja riset rendah (44.1% MCB 10A).'],
            ['Lab 6 Riset & Inovasi', PanelGroup::AC, 3476, 'MANUAL_ESTIMATE', 'Beban AC stabil (39.5% MCB 40A).'],
        ];

        $recordedAt = now()->subMinutes(15);

        foreach ($readings as [$labName, $group, $watt, $source, $notes]) {
            $lab = LabRoom::query()->where('name', $labName)->firstOrFail();

            PanelReading::query()->updateOrCreate(
                [
                    'lab_room_id' => $lab->id,
                    'group_type' => $group,
                    'recorded_at' => $recordedAt,
                ],
                [
                    'load_watt' => $watt,
                    'source' => $source,
                    'recorded_by' => $maintenance->id,
                    'notes' => $notes,
                ]
            );
        }
    }
}

<?php

namespace Database\Seeders;

use App\Enums\IncidentStatus;
use App\Models\LabRoom;
use App\Models\UrgentIncident;
use App\Models\User;
use Illuminate\Database\Seeder;

class IncidentSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'dosen.admin@unklab.ac.id')->firstOrFail();
        $auditor = User::query()->where('email', 'auditor@unklab.ac.id')->firstOrFail();
        $maintenance = User::query()->where('email', 'maintenance@unklab.ac.id')->firstOrFail();

        $incidents = [
            [
                'lab' => 'Lab 3 Jaringan & Keamanan',
                'reporter' => $auditor,
                'description' => 'Baris C (PC 29) — Kabel Power Terkelupas & Stopkontak Goyang: Terjadi spark kecil saat kabel monitor digoyang, memicu lonjakan watt.',
                'status' => IncidentStatus::Ditangani,
                'created_at' => now()->subMinutes(15),
                'status_note' => 'Teknisi sedang mengisolasi terminal meja baris C.',
            ],
            [
                'lab' => 'Lab 4 AI & Data Science',
                'reporter' => $admin,
                'description' => 'Split AC Unit 2 — Kompresor AC Dengung Keras & Arus Melonjak: Ampere AC2 terukur 11.2A (Standar 7.5A). Filter blower diduga tersumbat total.',
                'status' => IncidentStatus::Baru,
                'created_at' => now()->subMinutes(42),
                'status_note' => null,
            ],
            [
                'lab' => 'Lab 1 Komputer Dasar',
                'reporter' => $maintenance,
                'description' => 'Hub Dosen & Switch — UPS Rak Server Mengeluarkan Bunyi Alarm Berkala: Baterai internal degrade, standby consumption naik ke 190W saat idle malam.',
                'status' => IncidentStatus::Ditangani,
                'created_at' => now()->subHours(2),
                'status_note' => 'Sedang dilakukan pengecekan baterai UPS.',
            ],
            [
                'lab' => 'Lab 2 Rekayasa Perangkat Lunak',
                'reporter' => $auditor,
                'description' => 'Box Panel Sekring — Baut Terminal Netral MCB Mengalami Korosi Ringan: Pemeriksaan rutin mendeteksi suhu terminal 43°C dengan thermal gun.',
                'status' => IncidentStatus::Baru,
                'created_at' => now()->subHours(4),
                'status_note' => null,
            ],
            [
                'lab' => 'Lab 5 Multimedia & Desain',
                'reporter' => $admin,
                'description' => 'Meja Asisten 01 — Stopkontak Arde Tidak Menyentuh (Grounding Floating): Perlu penggantian modul stopkontak.',
                'status' => IncidentStatus::Selesai,
                'created_at' => now()->subDay(),
                'status_note' => 'Sudah diganti stopkontak Schneider baru & tes arde aman (0.8 Ohm).',
            ],
        ];

        foreach ($incidents as $data) {
            $lab = LabRoom::query()->where('name', $data['lab'])->firstOrFail();

            UrgentIncident::query()->firstOrCreate(
                ['lab_room_id' => $lab->id, 'description' => $data['description']],
                [
                    'reported_by' => $data['reporter']->id,
                    'status' => $data['status'],
                    'status_updated_by' => $data['status'] === IncidentStatus::Baru ? null : $maintenance->id,
                    'status_updated_at' => $data['status'] === IncidentStatus::Baru ? null : $data['created_at']->copy()->addMinutes(10),
                    'status_note' => $data['status_note'],
                    'resolved_at' => $data['status'] === IncidentStatus::Selesai ? $data['created_at']->copy()->addHours(2) : null,
                    'created_at' => $data['created_at'],
                    'updated_at' => $data['status'] === IncidentStatus::Baru ? $data['created_at'] : $data['created_at']->copy()->addMinutes(10),
                ]
            );
        }
    }
}

<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $password = 'Vampir#2026';

        $users = [
            // 2 Admin
            ['name' => 'Dosen Admin', 'email' => 'dosen.admin@unklab.ac.id', 'role' => UserRole::ADMIN],
            ['name' => 'Dr. R. Palit (Koordinator)', 'email' => 'admin@unklab.ac.id', 'role' => UserRole::ADMIN],
            // 6 Auditor
            ['name' => 'Mario K.', 'email' => 'auditor@unklab.ac.id', 'role' => UserRole::AUDITOR],
            ['name' => 'Sarah T.', 'email' => 'auditor2@unklab.ac.id', 'role' => UserRole::AUDITOR],
            ['name' => 'Juan W.', 'email' => 'juan.auditor@unklab.ac.id', 'role' => UserRole::AUDITOR],
            ['name' => 'Maya Lumenta', 'email' => 'maya.auditor@unklab.ac.id', 'role' => UserRole::AUDITOR],
            ['name' => 'Rendi Tumewu', 'email' => 'rendi.auditor@unklab.ac.id', 'role' => UserRole::AUDITOR],
            ['name' => 'Kevin Sanger', 'email' => 'kevin.auditor@unklab.ac.id', 'role' => UserRole::AUDITOR],
            // 4 Maintenance
            ['name' => 'Randy S.', 'email' => 'maintenance@unklab.ac.id', 'role' => UserRole::MAINTENANCE],
            ['name' => 'Riko Mamentu', 'email' => 'riko.maint@unklab.ac.id', 'role' => UserRole::MAINTENANCE],
            ['name' => 'Stenly K.', 'email' => 'stenly.maint@unklab.ac.id', 'role' => UserRole::MAINTENANCE],
            ['name' => 'Billy Rompas', 'email' => 'billy.maint@unklab.ac.id', 'role' => UserRole::MAINTENANCE],
            // 3 Pimpinan
            ['name' => 'Nadia Sondakh (WR II)', 'email' => 'pimpinan@unklab.ac.id', 'role' => UserRole::PIMPINAN],
            ['name' => 'Dekan FIK UNKLAB', 'email' => 'dekan.fik@unklab.ac.id', 'role' => UserRole::PIMPINAN],
            ['name' => 'Kepala Biro Keuangan', 'email' => 'keuangan@unklab.ac.id', 'role' => UserRole::PIMPINAN],
        ];

        foreach ($users as $user) {
            User::query()->updateOrCreate(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'password' => $password,
                    'role' => $user['role'],
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}

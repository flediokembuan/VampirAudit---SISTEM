<?php

namespace Database\Seeders;

use App\Models\MonthlyElectricityBill;
use App\Models\User;
use Illuminate\Database\Seeder;

class MonthlyBillSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'dosen.admin@unklab.ac.id')->firstOrFail();

        $bills = [
            5 => ['amount' => 64200000, 'emission' => 34650, 'notes' => null],
            6 => ['amount' => 67800000, 'emission' => 36590, 'notes' => null],
            7 => ['amount' => 61500000, 'emission' => 33190, 'notes' => 'Libur semester genap'],
            8 => ['amount' => 69300000, 'emission' => 37400, 'notes' => 'Awal semester ganjil'],
            9 => ['amount' => 72100000, 'emission' => 38910, 'notes' => 'Beban puncak perkuliahan'],
            10 => ['amount' => 68450000, 'emission' => 36940, 'notes' => null],
        ];

        foreach ($bills as $month => $row) {
            MonthlyElectricityBill::query()->updateOrCreate(
                ['period_year' => 2026, 'period_month' => $month],
                [
                    'total_amount' => $row['amount'],
                    'carbon_emission_kg' => $row['emission'],
                    'notes' => $row['notes'],
                    'created_by' => $admin->id,
                ]
            );
        }
    }
}

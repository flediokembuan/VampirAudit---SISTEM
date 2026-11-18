<?php

namespace App\Services;

use App\Models\AuditPcLog;
use App\Models\Setting;
use Illuminate\Support\Collection;

class EnergyCalculator
{
    public const PLN_TARIFF = 1444.70;
    public const CARBON_EMISSION_FACTOR = 0.78;
    public const VOLTAGE = 220;

    private ?array $parameters = null;

    public function flush(): void
    {
        $this->parameters = null;
    }

    public function parameters(): array
    {
        if ($this->parameters !== null) {
            return $this->parameters;
        }

        $defaults = config('vampir.defaults', []);
        try {
            $stored = Setting::query()->pluck('value', 'key');
        } catch (\Throwable) {
            $stored = collect();
        }

        $resolve = function (string $key) use ($defaults, $stored): float {
            $value = $stored->get($key);

            if ($value !== null && is_numeric($value)) {
                return (float) $value;
            }

            if (isset($defaults[$key]) && is_numeric($defaults[$key])) {
                return (float) $defaults[$key];
            }

            return match ($key) {
                'tariff_per_kwh' => self::PLN_TARIFF,
                'emission_factor_kg_per_kwh' => self::CARBON_EMISSION_FACTOR,
                'standby_hours_per_day' => 16.0,
                'standby_days_per_month' => 22.0,
                'default_warning_percent' => 80.0,
                'incident_poll_seconds' => 30.0,
                'active_pc_watt' => 150.0,
                default => 0.0,
            };
        };

        return $this->parameters = [
            'standby_hours_per_day' => $resolve('standby_hours_per_day'),
            'standby_days_per_month' => $resolve('standby_days_per_month'),
            'tariff_per_kwh' => $resolve('tariff_per_kwh'),
            'emission_factor_kg_per_kwh' => $resolve('emission_factor_kg_per_kwh'),
            'default_warning_percent' => (int) $resolve('default_warning_percent'),
            'incident_poll_seconds' => (int) $resolve('incident_poll_seconds'),
            'active_pc_watt' => $resolve('active_pc_watt'),
        ];
    }

    /**
     * Estimasi energi standby bulanan dari total watt standby unit yang diaudit.
     */
    public function monthlyEstimate(float $totalStandbyWatt, ?array $parameters = null): array
    {
        $parameters ??= $this->parameters();
        $hoursPerDay = $parameters['standby_hours_per_day'];
        $daysPerMonth = $parameters['standby_days_per_month'];
        $kwh = ($totalStandbyWatt * $hoursPerDay * $daysPerMonth) / 1000;
        $cost = $kwh * $parameters['tariff_per_kwh'];
        $emission = $kwh * $parameters['emission_factor_kg_per_kwh'];

        return [
            'total_standby_watt' => round($totalStandbyWatt, 2),
            'hours_per_day' => round($hoursPerDay, 2),
            'days_per_month' => round($daysPerMonth, 2),
            'kwh_per_month' => round($kwh, 4),
            'cost_per_month' => round($cost, 2),
            'emission_kg_per_month' => round($emission, 3),
            'tariff_per_kwh' => $parameters['tariff_per_kwh'],
            'emission_factor_kg_per_kwh' => $parameters['emission_factor_kg_per_kwh'],
            'calculated_at' => now()->toIso8601String(),
            'method' => 'Estimasi dari total watt standby unit hasil audit × jam standby × hari per bulan. Bukan pembacaan meter PLN.',
        ];
    }

    /**
     * @param  Collection<int, AuditPcLog>  $audits
     */
    public function estimateForAudits(Collection $audits, ?array $parameters = null): array
    {
        $totalWatt = $audits->sum(fn ($audit) => (float) $audit->standby_watt_snapshot);

        return $this->monthlyEstimate((float) $totalWatt, $parameters);
    }

    /**
     * Hitung energi standby terbuang per bulan dalam kWh.
     * calculateWastedEnergy(float $standbyWatt, int $units, float $hours): float
     */
    public function calculateWastedEnergy(float $standbyWatt, int $units, float $hours): float
    {
        return ($standbyWatt * $units * $hours) / 1000;
    }

    /**
     * Hitung kerugian finansial dari kWh yang terbuang.
     */
    public function calculateFinancialLoss(float $kWh): float
    {
        $params = $this->parameters();
        $tariff = $params['tariff_per_kwh'] ?? self::PLN_TARIFF;
        return round($kWh * $tariff, 2);
    }

    /**
     * Hitung persentase beban panel.
     */
    public function calculateLoadPercentage(float $current, float $limit): float
    {
        if ($limit <= 0) {
            return 0.0;
        }
        return round(($current / $limit) * 100, 2);
    }

    /**
     * Hitung emisi karbon dari kWh.
     */
    public function calculateCarbonEmission(float $kWh): float
    {
        $params = $this->parameters();
        $factor = $params['emission_factor_kg_per_kwh'] ?? self::CARBON_EMISSION_FACTOR;
        return round($kWh * $factor, 4);
    }
}

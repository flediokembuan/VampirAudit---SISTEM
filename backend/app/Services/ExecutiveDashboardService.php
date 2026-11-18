<?php

namespace App\Services;

use App\Models\AuditPcLog;
use App\Models\MonthlyElectricityBill;
use Illuminate\Support\Collection;

/**
 * UC-10 Executive Dashboard
 * Relasi: dipanggil oleh ExecutiveReportController dan MonthlyElectricityBillController
 */
class ExecutiveDashboardService
{
    public function __construct(
        private readonly ExecutiveReportService $reportService,
        private readonly EnergyCalculator $energy,
    ) {}

    /**
     * @return Collection<int, MonthlyElectricityBill>
     */
    public function getBillingHistory(): Collection
    {
        return MonthlyElectricityBill::query()
            ->orderByDesc('period_year')
            ->orderByDesc('period_month')
            ->limit(12)
            ->get();
    }

    public function getCarbonReduction(): float
    {
        $params = $this->energy->parameters();
        $factor = $params['emission_factor_kg_per_kwh'];
        $hoursPerMonth = $params['standby_hours_per_day'] * $params['standby_days_per_month'];

        $totalWatt = (float) AuditPcLog::query()->sum('standby_watt_snapshot');
        $kWh = ($totalWatt * $hoursPerMonth) / 1000;

        return round($kWh * $factor, 4);
    }
}

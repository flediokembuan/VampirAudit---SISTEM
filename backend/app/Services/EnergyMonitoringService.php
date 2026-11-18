<?php

namespace App\Services;

use App\DTOs\LabEnergyStatus;
use App\Models\AuditPcLog;
use App\Models\LabRoom;
use Illuminate\Support\Collection;

/**
 * UC-04 Energy Monitoring
 * Relasi: dipanggil oleh DashboardController
 * Include: menggunakan EnergyCalculator untuk perhitungan
 */
class EnergyMonitoringService
{
    public function __construct(private readonly EnergyCalculator $calculator) {}

    /**
     * @return Collection<int, LabEnergyStatus>
     */
    public function getLabEnergyStatus(): Collection
    {
        $params = $this->calculator->parameters();
        $hoursPerMonth = $params['standby_hours_per_day'] * $params['standby_days_per_month'];

        $aggregates = AuditPcLog::query()
            ->selectRaw('lab_room_id, COUNT(*) as audited_count')
            ->selectRaw('COALESCE(SUM(standby_watt_snapshot), 0) as total_watt')
            ->groupBy('lab_room_id')
            ->get()
            ->keyBy('lab_room_id');

        return LabRoom::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get()
            ->map(function (LabRoom $lab) use ($aggregates, $params, $hoursPerMonth) {
                $aggregate = $aggregates->get($lab->id);
                $auditedCount = (int) ($aggregate->audited_count ?? 0);
                $totalWatt = (float) ($aggregate->total_watt ?? 0);

                // Apply per-lab overrides
                $effectiveHoursPerMonth = $hoursPerMonth;
                if ($lab->standby_hours_per_day !== null && $lab->standby_days_per_month !== null) {
                    $effectiveHoursPerMonth = (float) $lab->standby_hours_per_day * (float) $lab->standby_days_per_month;
                }

                $wastedKWh = $this->calculator->calculateWastedEnergy($totalWatt, 1, $effectiveHoursPerMonth);
                $lossRp = $this->calculator->calculateFinancialLoss($wastedKWh);

                return new LabEnergyStatus(
                    labRoomId: $lab->id,
                    labName: $lab->name,
                    isAudited: $auditedCount > 0,
                    activeUnits: $auditedCount,
                    wastedKWh: round($wastedKWh, 4),
                    estimatedLossRp: round($lossRp, 2),
                );
            });
    }

    public function calculateWastedEnergy(int $labRoomId): float
    {
        $params = $this->calculator->parameters();
        $lab = LabRoom::query()->findOrFail($labRoomId);
        $hoursPerMonth = ($lab->standby_hours_per_day ?? $params['standby_hours_per_day'])
            * ($lab->standby_days_per_month ?? $params['standby_days_per_month']);

        $totalWatt = (float) AuditPcLog::query()
            ->where('lab_room_id', $labRoomId)
            ->sum('standby_watt_snapshot');

        return $this->calculator->calculateWastedEnergy($totalWatt, 1, $hoursPerMonth);
    }

    public function calculateFinancialLoss(int $labRoomId): float
    {
        return $this->calculator->calculateFinancialLoss($this->calculateWastedEnergy($labRoomId));
    }
}

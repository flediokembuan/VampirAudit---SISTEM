<?php

namespace App\Services;

use App\DTOs\PanelLoadStatus;
use App\Enums\PanelGroup;
use App\Models\PanelLimit;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * UC-07 Panel Monitoring
 * Relasi: dipanggil oleh PanelReadingController dan PanelLimitController
 */
class PanelMonitoringService
{
    public function __construct(
        private readonly PanelOverviewService $panelOverview,
        private readonly EnergyCalculator $energy,
    ) {}

    /**
     * @return Collection<int, PanelLimit>
     */
    public function getPanelLimits(): Collection
    {
        return PanelLimit::query()->with('labRoom')->get();
    }

    /**
     * @return Collection<int, PanelLoadStatus>
     */
    public function getPanelLoadStatus(): Collection
    {
        $overview = $this->panelOverview->overview();
        $statuses = collect();

        foreach ($overview['labs'] as $lab) {
            $socketPercent = 0.0;
            $acPercent = 0.0;

            foreach ($lab['panels'] as $panel) {
                $percent = (float) ($panel['percent'] ?? 0);
                if ($panel['group_type'] === PanelGroup::SOCKET->value) {
                    $socketPercent = $percent;
                } elseif ($panel['group_type'] === PanelGroup::AC->value) {
                    $acPercent = $percent;
                }
            }

            $isNearOrOver = $socketPercent >= 80 || $acPercent >= 80;
            $statuses->push(new PanelLoadStatus($socketPercent, $acPercent, $isNearOrOver));
        }

        return $statuses;
    }

    public function highlightOverLimit(PanelLoadStatus $status): void
    {
        if ($status->isNearOrOverLimit) {
            Log::warning('Panel load is near or over limit', $status->toArray());
        }
    }
}

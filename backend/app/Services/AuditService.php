<?php

namespace App\Services;

use App\Models\AuditPcLog;
use App\Models\LabRoom;
use App\Models\MasterPcSpec;
use Illuminate\Support\Collection;

/**
 * UC-08 PC Audit
 * Relasi: dipanggil oleh AuditPcLogController
 * Extend: FaultMarkingService (dipanggil saat is_faulty=true)
 */
class AuditService
{
    public function __construct(private readonly FaultMarkingService $faultMarking) {}

    public function selectLab(int $labRoomId): void
    {
        LabRoom::query()
            ->where('id', $labRoomId)
            ->where('is_active', true)
            ->firstOrFail();
    }

    public function getProgress(int $labRoomId): int
    {
        $lab = LabRoom::query()->withCount('audits')->findOrFail($labRoomId);
        if ($lab->capacity <= 0) {
            return 0;
        }
        return (int) round(($lab->audits_count / $lab->capacity) * 100);
    }

    /**
     * @return Collection<int, MasterPcSpec>
     */
    public function getSpecOptions(): Collection
    {
        return MasterPcSpec::query()
            ->where('is_active', true)
            ->orderBy('ram_gb')
            ->orderBy('storage_gb')
            ->get();
    }

    public function saveAndNext(array|AuditPcLog $log, ?int $auditedBy = null): bool
    {
        if ($log instanceof AuditPcLog) {
            $log->save();
            if ($log->is_faulty) {
                $this->faultMarking->markFaulty($log);
            }
            return true;
        }

        $auditedBy ??= (int) auth()->id();
        $model = AuditPcLog::query()->create(array_merge($log, ['audited_by' => $auditedBy]));

        if (! empty($log['is_faulty'])) {
            $this->faultMarking->markFaulty($model);
        }

        return true;
    }
}

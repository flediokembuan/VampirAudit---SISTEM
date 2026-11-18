<?php

namespace App\Services;

use App\Models\AuditPcLog;
use Illuminate\Support\Facades\Log;

/**
 * UC-09 Fault Marking
 * Relasi: dipanggil oleh AuditPcLogController
 * <<extend>> dari AuditService: hanya dipanggil saat PC rusak
 */
class FaultMarkingService
{
    public function markFaulty(AuditPcLog $log): void
    {
        if (!$log->is_faulty) {
            $log->update(['is_faulty' => true]);
        }

        Log::info('PC marked as faulty', [
            'audit_id' => $log->id,
            'pc_number' => $log->pc_number,
            'lab_room_id' => $log->lab_room_id,
        ]);
    }
}

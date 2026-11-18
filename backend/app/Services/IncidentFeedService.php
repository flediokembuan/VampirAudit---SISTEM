<?php

namespace App\Services;

use App\Models\UrgentIncident;
use Illuminate\Support\Facades\Log;

/**
 * UC-06 Incident Feed / Live Feed
 * Relasi: dipanggil oleh UrgentIncidentController dan IncidentReportService (<<include>>)
 */
class IncidentFeedService
{
    public function addToLiveFeed(UrgentIncident $incident): void
    {
        Log::info('Incident added to live feed', [
            'incident_id' => $incident->id,
            'lab_room_id' => $incident->lab_room_id,
            'status' => $incident->status?->value,
        ]);
    }

    public function notifyMaintenance(UrgentIncident $incident): void
    {
        Log::info('Maintenance team notified for incident', [
            'incident_id' => $incident->id,
            'lab_room_id' => $incident->lab_room_id,
            'description' => $incident->description,
        ]);
    }

    public function getIncidentDetail(int $incidentId): UrgentIncident
    {
        /** @var UrgentIncident */
        return UrgentIncident::query()
            ->with(['labRoom', 'reporter', 'statusUpdatedBy'])
            ->findOrFail($incidentId);
    }
}

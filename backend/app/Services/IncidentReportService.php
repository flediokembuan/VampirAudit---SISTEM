<?php

namespace App\Services;

use App\Enums\IncidentStatus;
use App\Models\LabRoom;
use App\Models\UrgentIncident;

/**
 * UC-05 Incident Reporting
 * Relasi: dipanggil oleh UrgentIncidentController
 * Include: IncidentFeedService (dipanggil setelah submit)
 */
class IncidentReportService
{
    public function __construct(private readonly IncidentFeedService $feedService) {}

    public function validateIncident(int $labRoomId, string $description): bool
    {
        return LabRoom::query()->where('id', $labRoomId)->exists()
            && strlen(trim($description)) >= 10;
    }

    public function submitIncident(int $labRoomId, string $description, ?int $reportedBy = null): UrgentIncident
    {
        $reportedBy ??= (int) (auth()->id() ?? 1);

        $incident = UrgentIncident::query()->create([
            'lab_room_id' => $labRoomId,
            'reported_by' => $reportedBy,
            'description' => trim($description),
            'status' => IncidentStatus::Baru,
        ]);

        $this->feedService->addToLiveFeed($incident);
        $this->feedService->notifyMaintenance($incident);

        return $incident;
    }
}

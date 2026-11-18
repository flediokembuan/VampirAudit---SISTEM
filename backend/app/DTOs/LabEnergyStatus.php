<?php

namespace App\DTOs;

readonly class LabEnergyStatus implements \JsonSerializable
{
    /**
     * Note: labRoomId and labName are additions beyond the class diagram
     * to allow row identification in collection responses.
     */
    public function __construct(
        public int $labRoomId,
        public string $labName,
        public bool $isAudited,
        public int $activeUnits,
        public float $wastedKWh,
        public float $estimatedLossRp,
    ) {}

    public function toArray(): array
    {
        return [
            'lab_room_id' => $this->labRoomId,
            'lab_name' => $this->labName,
            'is_audited' => $this->isAudited,
            'active_units' => $this->activeUnits,
            'wasted_kwh' => $this->wastedKWh,
            'estimated_loss_rp' => $this->estimatedLossRp,
        ];
    }

    public function jsonSerialize(): mixed
    {
        return $this->toArray();
    }
}

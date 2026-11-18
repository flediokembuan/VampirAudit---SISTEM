<?php

namespace App\DTOs;

readonly class PanelLoadStatus implements \JsonSerializable
{
    public function __construct(
        public float $socketLoadPercent,
        public float $acLoadPercent,
        public bool $isNearOrOverLimit,
    ) {}

    public function toArray(): array
    {
        return [
            'socket_load_percent' => $this->socketLoadPercent,
            'ac_load_percent' => $this->acLoadPercent,
            'is_near_or_over_limit' => $this->isNearOrOverLimit,
        ];
    }

    public function jsonSerialize(): mixed
    {
        return $this->toArray();
    }
}

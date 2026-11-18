<?php

namespace App\Services;

use App\Models\MasterPcSpec;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * UC-03 Master Data Management
 */
class MasterDataService
{
    public function getMasterPCSpecs(): Collection
    {
        return MasterPcSpec::query()->where('is_active', true)->get();
    }

    public function addSpec(array|MasterPcSpec $spec): bool
    {
        if ($spec instanceof MasterPcSpec) {
            $spec->save();
            return true;
        }

        MasterPcSpec::query()->create($spec);

        return true;
    }

    public function updateSpec(array|MasterPcSpec $spec, ?MasterPcSpec $masterPcSpec = null): bool
    {
        if ($spec instanceof MasterPcSpec) {
            $spec->save();
            return true;
        }

        $target = $masterPcSpec ?? MasterPcSpec::query()->findOrFail($spec['id']);
        $target->update($spec);

        return true;
    }

    public function deleteSpec(int $specId): bool
    {
        if ($this->checkUsage($specId)) {
            throw ValidationException::withMessages([
                'master_pc_spec' => 'Spesifikasi sudah dipakai pada catatan audit. Nonaktifkan alih-alih menghapus.',
            ]);
        }

        MasterPcSpec::query()->findOrFail($specId)->delete();

        return true;
    }

    public function validateSpecInput(mixed $spec): bool
    {
        if ($spec instanceof MasterPcSpec) {
            return ! empty($spec->ram_gb) && ! empty($spec->storage_gb) && ! empty($spec->storage_type);
        }

        if (is_array($spec)) {
            return isset($spec['ram_gb'], $spec['storage_gb'], $spec['storage_type']);
        }

        return false;
    }

    public function checkUsage(int $specId): bool
    {
        $spec = MasterPcSpec::query()->find($specId);

        return $spec !== null && $spec->audits()->exists();
    }
}

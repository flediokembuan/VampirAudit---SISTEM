<?php

namespace App\Http\Requests;

use App\Models\MasterPcSpec;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateMasterPcSpecRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ram_gb' => ['sometimes', 'required', 'integer', 'min:1', 'max:1024'],
            'storage_gb' => ['sometimes', 'required', 'integer', 'min:1', 'max:100000'],
            'storage_type' => ['sometimes', 'required', 'string', Rule::in(['SSD', 'HDD', 'NVME'])],
            'cpu' => ['sometimes', 'nullable', 'string', 'max:100'],
            'standby_watt' => ['sometimes', 'required', 'numeric', 'gt:0', 'max:10000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $spec = $this->route('master_pc_spec');
                $ram = $this->integer('ram_gb', $spec->ram_gb);
                $storage = $this->integer('storage_gb', $spec->storage_gb);
                $type = strtoupper($this->string('storage_type', $spec->storage_type)->toString());

                if ($this->has('cpu')) {
                    $rawCpu = trim((string) $this->input('cpu', ''));
                    $cpu = $rawCpu !== '' ? $rawCpu : null;
                } else {
                    $cpu = $spec->cpu;
                }

                $query = MasterPcSpec::query()
                    ->whereKeyNot($spec->getKey())
                    ->where('ram_gb', $ram)
                    ->where('storage_gb', $storage)
                    ->where('storage_type', $type);

                if ($cpu === null) {
                    $query->whereNull('cpu');
                } else {
                    $query->where('cpu', $cpu);
                }

                if ($query->exists()) {
                    $validator->errors()->add('ram_gb', 'Kombinasi RAM, kapasitas, tipe penyimpanan, dan CPU sudah ada.');
                }
            },
        ];
    }
}

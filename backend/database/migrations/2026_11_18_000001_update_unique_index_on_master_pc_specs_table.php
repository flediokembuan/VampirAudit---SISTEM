<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('master_pc_specs', function (Blueprint $table) {
            $table->dropUnique(['ram_gb', 'storage_gb', 'storage_type']);
            $table->unique(['ram_gb', 'storage_gb', 'storage_type', 'cpu'], 'master_pc_specs_ram_storage_type_cpu_unique');
        });
    }

    public function down(): void
    {
        Schema::table('master_pc_specs', function (Blueprint $table) {
            $table->dropUnique('master_pc_specs_ram_storage_type_cpu_unique');
            $table->unique(['ram_gb', 'storage_gb', 'storage_type']);
        });
    }
};

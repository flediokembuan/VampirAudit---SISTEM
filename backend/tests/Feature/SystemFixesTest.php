<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AuditPcLog;
use App\Models\LabRoom;
use App\Models\MasterPcSpec;
use App\Models\PanelLimit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SystemFixesTest extends TestCase
{
    use RefreshDatabase;

    public function test_deactivating_user_via_update_revokes_tokens_and_blocks_all_endpoints(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
            'is_active' => true,
        ]);

        $auditor = User::factory()->create([
            'role' => UserRole::AUDITOR,
            'is_active' => true,
        ]);

        $plainToken = $auditor->createToken('web')->plainTextToken;

        $this->withToken($plainToken)->getJson('/api/dashboard')->assertOk();

        Sanctum::actingAs($admin);
        $this->patchJson("/api/users/{$auditor->id}", [
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseCount('personal_access_tokens', 0);

        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($auditor->refresh());
        $this->getJson('/api/dashboard')->assertForbidden();
    }

    public function test_creating_lab_creates_default_panel_limits_and_settings_sync_warning_percent(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/labs', [
            'name' => 'Lab 7 Riset Terpadu',
            'location' => 'GK1-307 • LT. 3',
            'capacity' => 30,
        ])->assertCreated();

        $labId = $response->json('data.id');

        $this->assertDatabaseHas('panel_limits', [
            'lab_room_id' => $labId,
            'group_type' => 'SOCKET',
            'limit_ampere' => 10,
            'warning_percent' => 80,
        ]);

        $this->assertDatabaseHas('panel_limits', [
            'lab_room_id' => $labId,
            'group_type' => 'AC',
            'limit_ampere' => 40,
            'warning_percent' => 80,
        ]);

        $this->postJson('/api/panel-readings', [
            'lab_room_id' => $labId,
            'group_type' => 'SOCKET',
            'load_watt' => 1800,
        ])->assertCreated();

        $this->patchJson('/api/settings', [
            'default_warning_percent' => 75,
        ])->assertOk();

        $this->assertSame(
            75,
            PanelLimit::query()->where('lab_room_id', $labId)->where('group_type', 'SOCKET')->value('warning_percent')
        );
    }

    public function test_audits_index_allows_per_page_above_100(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
            'is_active' => true,
        ]);

        $lab = LabRoom::query()->create([
            'name' => 'Lab Uji Besar',
            'capacity' => 150,
        ]);

        $spec = MasterPcSpec::query()->create([
            'ram_gb' => 16,
            'storage_gb' => 512,
            'storage_type' => 'SSD',
            'standby_watt' => 4.0,
            'is_active' => true,
        ]);

        $rows = [];
        for ($i = 1; $i <= 120; $i++) {
            $rows[] = [
                'lab_room_id' => $lab->id,
                'pc_number' => sprintf('PC-%03d', $i),
                'master_pc_spec_id' => $spec->id,
                'ram_gb_snapshot' => 16,
                'storage_gb_snapshot' => 512,
                'storage_type_snapshot' => 'SSD',
                'standby_watt_snapshot' => 4.0,
                'is_faulty' => false,
                'audited_by' => $admin->id,
                'audited_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        AuditPcLog::query()->insert($rows);

        Sanctum::actingAs($admin);

        $this->getJson('/api/audits?per_page=300')
            ->assertOk()
            ->assertJsonCount(120, 'data');
    }
}

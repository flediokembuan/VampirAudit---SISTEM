<?php

namespace Tests\Feature;

use App\Enums\IncidentStatus;
use App\Enums\UserRole;
use App\Models\AuditPcLog;
use App\Models\LabRoom;
use App\Models\MasterPcSpec;
use App\Models\UrgentIncident;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VampirAuditTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): User
    {
        return User::factory()->create([
            'role' => UserRole::ADMIN,
            'is_active' => true,
        ]);
    }

    private function makeAuditor(): User
    {
        return User::factory()->create([
            'role' => UserRole::AUDITOR,
            'is_active' => true,
        ]);
    }

    private function makeMaintenance(): User
    {
        return User::factory()->create([
            'role' => UserRole::MAINTENANCE,
            'is_active' => true,
        ]);
    }

    // UC-01: Login test
    public function test_login_returns_token_and_user(): void
    {
        $user = User::factory()->create([
            'email' => 'admin@test.com',
            'password' => bcrypt('password123'),
            'role' => UserRole::ADMIN,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'admin@test.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::factory()->create([
            'email' => 'user@test.com',
            'password' => bcrypt('correct'),
            'role' => UserRole::AUDITOR,
            'is_active' => true,
        ]);

        $this->postJson('/api/login', [
            'email' => 'user@test.com',
            'password' => 'wrong',
        ])->assertStatus(422);
    }

    public function test_login_fails_for_inactive_user(): void
    {
        User::factory()->create([
            'email' => 'inactive@test.com',
            'password' => bcrypt('password123'),
            'role' => UserRole::AUDITOR,
            'is_active' => false,
        ]);

        $this->postJson('/api/login', [
            'email' => 'inactive@test.com',
            'password' => 'password123',
        ])->assertStatus(422);
    }

    // UC-05 + UC-06: Submit incident -> feeds
    public function test_submit_incident_creates_record_with_baru_status(): void
    {
        $user = $this->makeAuditor();
        $lab = LabRoom::factory()->create(['is_active' => true]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/incidents', [
                'lab_room_id' => $lab->id,
                'description' => 'Komputer lab tiba-tiba mati semua',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', IncidentStatus::Baru->value);

        $this->assertDatabaseHas('urgent_incidents', [
            'lab_room_id' => $lab->id,
            'reported_by' => $user->id,
            'status' => IncidentStatus::Baru->value,
        ]);
    }

    // UC-08 + UC-09: saveAndNext + markFaulty
    public function test_audit_store_creates_log_and_marks_faulty(): void
    {
        $auditor = $this->makeAuditor();
        $lab = LabRoom::factory()->create(['is_active' => true, 'capacity' => 10]);
        $spec = MasterPcSpec::factory()->create(['is_active' => true]);

        $response = $this->actingAs($auditor, 'sanctum')
            ->postJson('/api/audits', [
                'lab_room_id' => $lab->id,
                'pc_number' => 'PC-01',
                'master_pc_spec_id' => $spec->id,
                'is_faulty' => true,
                'fault_note' => 'Monitor rusak',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.is_faulty', true);

        $this->assertDatabaseHas('audit_pc_logs', [
            'lab_room_id' => $lab->id,
            'pc_number' => 'PC-01',
            'is_faulty' => true,
        ]);
    }

    public function test_audit_store_normal_pc(): void
    {
        $auditor = $this->makeAuditor();
        $lab = LabRoom::factory()->create(['is_active' => true, 'capacity' => 10]);
        $spec = MasterPcSpec::factory()->create(['is_active' => true]);

        $response = $this->actingAs($auditor, 'sanctum')
            ->postJson('/api/audits', [
                'lab_room_id' => $lab->id,
                'pc_number' => 'PC-02',
                'master_pc_spec_id' => $spec->id,
                'is_faulty' => false,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.is_faulty', false);
    }

    // UC-11: Export PDF endpoint
    public function test_pdf_export_endpoint_exists_and_requires_auth(): void
    {
        $this->getJson('/api/reports/executive/pdf')
            ->assertStatus(401);
    }

    public function test_executive_summary_returns_json(): void
    {
        $admin = $this->makeAdmin();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/reports/executive/summary');

        $response->assertStatus(200)
            ->assertJsonStructure(['generated_at', 'labs', 'totals', 'bills']);
    }

    public function test_executive_pdf_download_succeeds_for_authorized_role(): void
    {
        $admin = $this->makeAdmin();

        $response = $this->actingAs($admin, 'sanctum')
            ->get('/api/reports/executive/pdf');

        $response->assertStatus(200);
        $this->assertTrue(str_contains($response->headers->get('content-type', ''), 'pdf') || str_contains($response->headers->get('content-disposition', ''), '.pdf'));
    }
}

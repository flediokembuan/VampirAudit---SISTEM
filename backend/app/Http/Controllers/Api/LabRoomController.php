<?php

namespace App\Http\Controllers\Api;

use App\Enums\PanelGroup;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLabRoomRequest;
use App\Http\Requests\UpdateLabRoomRequest;
use App\Http\Resources\LabRoomResource;
use App\Models\LabRoom;
use App\Models\PanelLimit;
use App\Services\EnergyCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LabRoomController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = LabRoom::query()->withCount('audits')->orderBy('id');

        $includeInactive = $request->boolean('include_inactive') && $request->user()->isAdmin();

        if (! $includeInactive) {
            $query->where('is_active', true);
        }

        return LabRoomResource::collection($query->get());
    }

    public function store(StoreLabRoomRequest $request, EnergyCalculator $energy): JsonResponse
    {
        $warningPercent = (int) $energy->parameters()['default_warning_percent'];
        $voltage = (float) config('vampir.voltage', 220);

        $labRoom = DB::transaction(function () use ($request, $warningPercent, $voltage): LabRoom {
            $lab = LabRoom::query()->create([
                ...$request->validated(),
                'is_active' => $request->boolean('is_active', true),
            ]);

            foreach ([[PanelGroup::SOCKET, 10], [PanelGroup::AC, 40]] as [$group, $ampere]) {
                PanelLimit::query()->create([
                    'lab_room_id' => $lab->id,
                    'group_type' => $group,
                    'limit_ampere' => $ampere,
                    'voltage' => $voltage,
                    'warning_percent' => $warningPercent,
                ]);
            }

            return $lab;
        });

        return response()->json(['data' => new LabRoomResource($labRoom)], 201);
    }

    public function update(UpdateLabRoomRequest $request, LabRoom $labRoom): JsonResponse
    {
        $labRoom->update($request->validated());

        return response()->json(['data' => new LabRoomResource($labRoom->refresh())]);
    }

    public function destroy(LabRoom $labRoom): JsonResponse
    {
        if ($labRoom->audits()->exists() || $labRoom->panelReadings()->exists() || $labRoom->incidents()->exists()) {
            throw ValidationException::withMessages([
                'lab_room' => 'Lab sudah memiliki data audit, pembacaan beban panel, atau laporan insiden. Nonaktifkan lab alih-alih menghapusnya.',
            ]);
        }

        $labRoom->delete();

        return response()->json(['message' => 'Lab dihapus.']);
    }
}

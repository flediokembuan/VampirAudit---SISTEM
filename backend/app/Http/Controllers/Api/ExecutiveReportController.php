<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ExecutiveDashboardService;
use App\Services\ExecutiveReportService;
use App\Services\ReportExportService;
use Illuminate\Http\JsonResponse;

class ExecutiveReportController extends Controller
{
    public function __construct(
        private readonly ExecutiveReportService $reportService,
        private readonly ExecutiveDashboardService $dashboardService,
        private readonly ReportExportService $exportService,
    ) {}

    public function summary(): JsonResponse
    {
        return response()->json($this->reportService->payload());
    }

    public function download()
    {
        $pdf = $this->exportService->generatePDFReport();
        $filename = 'laporan-eksekutif-vampir-' . now()->format('Ymd-His') . '.pdf';
        return $pdf->download($filename);
    }
}

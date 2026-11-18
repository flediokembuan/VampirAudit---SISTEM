<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;

/**
 * UC-11 Report Export
 * Relasi: dipanggil oleh ExecutiveReportController
 * Extend: ExecutiveDashboardService (data sumber laporan)
 */
class ReportExportService
{
    public function __construct(
        private readonly ExecutiveDashboardService $dashboardService,
        private readonly ExecutiveReportService $reportService,
    ) {}

    public function generatePDFReport(): mixed
    {
        $report = $this->reportService->payload();

        return Pdf::loadView('reports.executive', ['report' => $report])
            ->setPaper('a4', 'portrait')
            ->setOption(['isRemoteEnabled' => false]);
    }

    public function provideDownload($file): bool
    {
        $filename = 'laporan-eksekutif-vampir-' . now()->format('Ymd-His') . '.pdf';
        $file->download($filename);
        return true;
    }

    public function showErrorWithRetry(): void
    {
        throw new \RuntimeException('Gagal generate PDF. Silakan coba lagi.');
    }
}

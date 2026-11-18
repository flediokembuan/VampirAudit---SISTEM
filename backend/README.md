<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).


## Arsitektur

### Pemetaan Class Diagram → File Kode

Tabel ini memetakan setiap kelas di Class Diagram proyek ke file implementasi di kode.

| Kelas Diagram | File | Keterangan |
|---|---|---|
| AuthService (UC-01) | `app/Services/AuthService.php` | verifyCredentials, checkRoleAndStatus, redirectToDashboard |
| UserManagementService (UC-02) | `app/Services/UserManagementService.php` | getUsersAndRoles, addUser, updateUser, deactivateUser, validateUserData |
| MasterDataService (UC-03) | `app/Services/MasterDataService.php` | getMasterPCSpecs, addSpec, updateSpec, deleteSpec, validateSpecInput, checkUsage |
| EnergyMonitoringService (UC-04) | `app/Services/EnergyMonitoringService.php` | getLabEnergyStatus (→ LabEnergyStatus DTO), calculateWastedEnergy, calculateFinancialLoss |
| IncidentReportService (UC-05) | `app/Services/IncidentReportService.php` | validateIncident, submitIncident (→ include IncidentFeedService) |
| IncidentFeedService (UC-06) | `app/Services/IncidentFeedService.php` | addToLiveFeed, notifyMaintenance, getIncidentDetail |
| PanelMonitoringService (UC-07) | `app/Services/PanelMonitoringService.php` | getPanelLimits, getPanelLoadStatus (→ PanelLoadStatus DTO), highlightOverLimit |
| AuditService (UC-08) | `app/Services/AuditService.php` | selectLab, getProgress, getSpecOptions, saveAndNext |
| FaultMarkingService (UC-09) | `app/Services/FaultMarkingService.php` | markFaulty (extend AuditService: hanya saat PC rusak) |
| ExecutiveDashboardService (UC-10) | `app/Services/ExecutiveDashboardService.php` | getBillingHistory, getCarbonReduction |
| ReportExportService (UC-11) | `app/Services/ReportExportService.php` | generatePDFReport, provideDownload, showErrorWithRetry (extend ExecutiveDashboardService) |
| EnergyCalculator | `app/Services/EnergyCalculator.php` | Utility: calculateWastedEnergy, calculateFinancialLoss, calculateLoadPercentage, calculateCarbonEmission + constants PLN_TARIFF, CARBON_EMISSION_FACTOR, VOLTAGE |
| PanelLoadStatus DTO | `app/DTOs/PanelLoadStatus.php` | socketLoadPercent, acLoadPercent, isNearOrOverLimit |
| LabEnergyStatus DTO | `app/DTOs/LabEnergyStatus.php` | labRoomId*, labName*, isAudited, activeUnits, wastedKWh, estimatedLossRp (*tambahan di luar diagram) |
| User | `app/Models/User.php` | Eloquent model; role→UserRole enum; isActive→is_active; getRole() method |
| LabRoom | `app/Models/LabRoom.php` | Eloquent model; roomName→name; capacityPC→capacity |
| MasterPcSpec | `app/Models/MasterPcSpec.php` | Eloquent model; ramCapacity→ram_gb; ssdCapacity→storage_gb; standbyWatt→standby_watt |
| AuditPcLog | `app/Models/AuditPcLog.php` | Eloquent model; pcNumber→pc_number; isFaulty→is_faulty |
| PanelLimit | `app/Models/PanelLimit.php` | Eloquent model; socketLimitAmpere/acLimitAmpere → terpisah per baris dengan group_type (SOCKET/AC) |
| UrgentIncident | `app/Models/UrgentIncident.php` | Eloquent model; issueDescription→description; status→IncidentStatus enum |
| MonthlyElectricityBill | `app/Models/MonthlyElectricityBill.php` | Eloquent model; month→period_month; year→period_year; totalBillRp→total_amount; carbonEmissionKg→carbon_emission_kg |
| UserRole | `app/Enums/UserRole.php` | Enum: ADMIN, AUDITOR, MAINTENANCE, PIMPINAN; homePath() |
| IncidentStatus | `app/Enums/IncidentStatus.php` | Enum: Baru, Ditangani, Selesai |

### Elemen di Kode yang Belum Ada di Class Diagram

Elemen-elemen berikut ada di implementasi tetapi belum digambarkan di Class Diagram dan **perlu ditambahkan ke Class Diagram**:

| Elemen | File | Keterangan |
|---|---|---|
| PanelReading | `app/Models/PanelReading.php` | Entitas input beban panel manual per grup (SOCKET/AC) |
| Setting | `app/Models/Setting.php` | Tabel konfigurasi parameter sistem (tarif PLN, jam standby, dll.) |
| SettingHistory | `app/Models/SettingHistory.php` | Riwayat perubahan Setting |
| PanelReadingController | `app/Http/Controllers/Api/PanelReadingController.php` | CRUD pembacaan panel (input manual beban Watt) |
| PanelLimitController | `app/Http/Controllers/Api/PanelLimitController.php` | Update batas ampere panel per lab |
| SettingController | `app/Http/Controllers/Api/SettingController.php` | CRUD parameter sistem dan riwayat perubahan |
| LabAuditSummaryService | `app/Services/LabAuditSummaryService.php` | Agregasi data audit per lab (dipanggil oleh DashboardController & ExecutiveReportService) |
| PanelOverviewService | `app/Services/PanelOverviewService.php` | Overview status panel semua lab (dipanggil oleh PanelLimitController & DashboardController) |
| PanelStatusService | `app/Services/PanelStatusService.php` | Evaluasi status beban panel (NORMAL/WARNING/OVER/UNAVAILABLE) |
| ExecutiveReportService | `app/Services/ExecutiveReportService.php` | Payload laporan eksekutif (payload() – digabung di UC-10/11) |
| PanelGroup | `app/Enums/PanelGroup.php` | Enum grup panel: SOCKET, AC |
| LabRoomController | `app/Http/Controllers/Api/LabRoomController.php` | CRUD ruang lab |
| MonthlyElectricityBillController | `app/Http/Controllers/Api/MonthlyElectricityBillController.php` | CRUD tagihan listrik bulanan |

### Arsitektur Berlapis (Thin Controller Pattern)

```
HTTP Request
     │
     ▼
FormRequest (Validasi input)
     │
     ▼
Controller (thin: validasi, panggil Service, kembalikan response)
     │
     ▼
Service (logika bisnis: UC-01..UC-11)
     │
     ├──► Model (Eloquent ORM, relasi, cast)
     ├──► DTO (readonly class, toArray / JsonSerializable)
     └──► Utility (EnergyCalculator)
```

### Penyimpangan dari Diagram Beserta Alasan

| Hal yang Menyimpang | Alasan |
|---|---|
| `LabEnergyStatus` memiliki tambahan `labRoomId` dan `labName` | Agar tiap baris dalam collection response dapat diidentifikasi; diperlukan oleh frontend |
| `PanelLimit` memakai satu baris per grup (SOCKET/AC) bukan `socketLimitAmpere`/`acLimitAmpere` dalam satu record | Desain yang lebih fleksibel; mudah ditambah grup panel baru tanpa migrasi |
| `MonthlyElectricityBill` menggunakan `period_month`/`period_year` bukan `month`/`year` | Menghindari konflik dengan kata kunci SQL |
| `UrgentIncident.description` bukan `issueDescription` | Konvensi snake_case Laravel; diagram memakai camelCase |
| `LabRoom.name`/`capacity` bukan `roomName`/`capacityPC` | Konvensi snake_case Laravel; lebih singkat |
| `MasterPcSpec.ram_gb`, `storage_gb` bukan `ramCapacity`, `ssdCapacity` | Menyertakan satuan (GB) dalam nama kolom untuk kejelasan |
| `AuditService.saveAndNext()` tidak return `AuditPcLog` langsung | Mengembalikan `bool` sudah cukup; objek log dibuat dan diakses di Controller |
| `ReportExportService.provideDownload()` tidak langsung stream response | Service bersifat agnostik HTTP; Controller yang memanggil `->download()` |

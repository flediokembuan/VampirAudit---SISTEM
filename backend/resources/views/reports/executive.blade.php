<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Laporan Resmi Eksekutif Audit Listrik Vampir FIK UNKLAB</title>
    <style>
        @page { margin: 28px 32px 34px; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #1e293b; font-family: "DejaVu Sans", sans-serif; font-size: 9.5px; line-height: 1.45; }
        .header-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
        .header-table td { vertical-align: middle; }
        .logo-box { width: 44px; height: 44px; border-radius: 50%; background: #0284c7; color: #ffffff; text-align: center; font-size: 20px; font-weight: bold; line-height: 44px; margin-right: 12px; }
        .inst-title { font-size: 14px; font-weight: 900; letter-spacing: .5px; color: #0f172a; }
        .fac-title { font-size: 12px; font-weight: 700; color: #0284c7; letter-spacing: .3px; }
        .address { font-size: 8.5px; color: #64748b; margin-top: 2px; }
        .doc-title { font-size: 10px; font-weight: 800; color: #334155; margin-top: 4px; text-transform: uppercase; }
        .confidential-badge { display: inline-block; background: #fef3c7; border: 1px solid #d97706; color: #92400e; font-size: 8px; font-weight: 800; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; }
        .verified-text { font-size: 8.5px; font-weight: 700; color: #15803d; margin-top: 3px; }
        
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .meta-table td { width: 25%; padding: 4px; vertical-align: top; }
        .meta-card { border: 1px solid #cbd5e1; border-radius: 5px; padding: 6px 8px; background: #f8fafc; }
        .meta-label { font-size: 7.5px; font-weight: 700; color: #64748b; text-transform: uppercase; }
        .meta-val { font-size: 9.5px; font-weight: 700; color: #0f172a; margin-top: 2px; font-family: "DejaVu Sans Mono", monospace; }

        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .data-table th { background: #f1f5f9; color: #334155; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: .4px; padding: 6px 8px; border-bottom: 1.5px solid #94a3b8; }
        .data-table td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; font-size: 9px; }
        .data-table tr:nth-child(even) td { background: #f8fafc; }
        .right { text-align: right; }
        .center { text-align: center; }
        .total-row td { background: #e2e8f0 !important; font-weight: 800; color: #0f172a; border-top: 1.5px solid #64748b; border-bottom: 2px solid #0f172a; }

        .signatures-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .signatures-table td { width: 50%; padding: 0 10px; vertical-align: top; text-align: center; }
        .sig-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; background: #f8fafc; }
        .sig-role { font-size: 8px; font-weight: 700; color: #475569; letter-spacing: .5px; margin-bottom: 6px; }
        .sig-badge { display: inline-block; background: #dcfce7; border: 1px solid #16a34a; color: #166534; font-size: 7.5px; font-weight: 800; padding: 2px 8px; border-radius: 4px; margin-bottom: 6px; font-family: "DejaVu Sans Mono", monospace; }
        .sig-name { font-size: 11px; font-weight: 800; color: #0f172a; }
        .sig-title { font-size: 9px; color: #64748b; margin-top: 1px; }
        .sig-nip { font-size: 8px; color: #64748b; font-family: "DejaVu Sans Mono", monospace; margin-top: 1px; }

        .footer-note { font-size: 7.5px; color: #94a3b8; margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 6px; display: table; width: 100%; }
        .footer-note-left { display: table-cell; text-align: left; }
        .footer-note-right { display: table-cell; text-align: right; }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td style="width: 52px;">
                <div class="logo-box">U</div>
            </td>
            <td>
                <div class="inst-title">UNIVERSITAS KLABAT</div>
                <div class="fac-title">FAKULTAS ILMU KOMPUTER</div>
                <div class="address">Jl. Arnold Mononutu, Airmadidi Bawah, Minahasa Utara, Sulawesi Utara 95371</div>
                <div class="doc-title">LAPORAN AKHIR ENERGI STANDBY LAB KOMPUTER</div>
            </td>
            <td style="text-align: right;">
                <div class="confidential-badge">LEMBAR PIMPINAN RAHASIA / INTERNAL</div>
                <div class="verified-text">&#10003; VERIFIED</div>
            </td>
        </tr>
    </table>

    <table class="meta-table">
        <tr>
            <td>
                <div class="meta-card">
                    <div class="meta-label">NO KOD DOKUMEN</div>
                    <div class="meta-val">UNKLAB/FIK/AUDIT-VAMPIR/2024/04</div>
                </div>
            </td>
            <td>
                <div class="meta-card">
                    <div class="meta-label">TANGGAL VERIFIKASI</div>
                    <div class="meta-val">{{ now()->format('d F Y') }}</div>
                </div>
            </td>
            <td>
                <div class="meta-card">
                    <div class="meta-label">KLASIFIKASI AUDIT</div>
                    <div class="meta-val" style="color: #15803d;">Green Campus Tier-1</div>
                </div>
            </td>
            <td>
                <div class="meta-card">
                    <div class="meta-label">STATUS VALIDASI</div>
                    <div class="meta-val" style="color: #0284c7;">Lengkap &amp; Disahkan</div>
                </div>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 32%;">ENTITAS OBSERVASI</th>
                <th class="center" style="width: 13%;">KAPASITAS PC</th>
                <th class="center" style="width: 13%;">PC TERBACA</th>
                <th class="right" style="width: 14%;">FAKTOR VAMPIR</th>
                <th class="right" style="width: 14%;">EMISI (CO2E)</th>
                <th class="right" style="width: 14%;">BIAYA STANDBY</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($report['labs'] as $lab)
                <tr>
                    <td><strong>{{ $lab['name'] }}</strong></td>
                    <td class="center">{{ $lab['capacity'] }}</td>
                    <td class="center">{{ $lab['audited_count'] }}</td>
                    <td class="right">{{ $lab['not_audited'] ? '—' : number_format($lab['energy']['kwh_per_month'], 0, ',', '.') . ' kWh' }}</td>
                    <td class="right">{{ $lab['not_audited'] ? '—' : number_format($lab['energy']['emission_kg_per_month'], 1, ',', '.') . ' kg' }}</td>
                    <td class="right">{{ $lab['not_audited'] ? '—' : 'Rp ' . number_format($lab['energy']['cost_per_month'], 0, ',', '.') }}</td>
                </tr>
            @endforeach
            <tr class="total-row">
                <td>Total Keseluruhan ({{ count($report['labs']) }} Lab)</td>
                <td class="center">{{ $report['totals']['pc_target'] }}</td>
                <td class="center">{{ $report['totals']['audited'] }} ({{ number_format($report['totals']['progress_percent'], 1, ',', '.') }}%)</td>
                <td class="right">{{ number_format($report['totals']['kwh_per_month'], 0, ',', '.') }} kWh</td>
                <td class="right">{{ number_format($report['totals']['emission_kg_per_month'], 0, ',', '.') }} kg</td>
                <td class="right">Rp {{ number_format($report['totals']['cost_per_month'], 0, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <table class="signatures-table">
        <tr>
            <td>
                <div class="sig-box">
                    <div class="sig-role">PENANGGUNG JAWAB TEKNIS AUDIT</div>
                    <div class="sig-badge">DIGITALLY SIGNED ID: FIK-EP-2024-VPP</div>
                    <div class="sig-name">Dr. Ir. E. Pasuhuk</div>
                    <div class="sig-title">Dosen PJ Audit Energi / Admin FIK</div>
                    <div class="sig-nip">NIP: 197804122005011032</div>
                </div>
            </td>
            <td>
                <div class="sig-box">
                    <div class="sig-role">PIMPINAN KAMPUS / DEKAN FIK</div>
                    <div class="sig-badge">DIGITALLY ACKNOWLEDGED ID: UNKLAR-DEK-GLOBAL</div>
                    <div class="sig-name">Prof. Dr. L. Wenas</div>
                    <div class="sig-title">Pimpinan Kampus / Dekan FIK</div>
                    <div class="sig-nip">NIP: 196903151994031001</div>
                </div>
            </td>
        </tr>
    </table>

    <div class="footer-note">
        <span class="footer-note-left">Sistem Audit Listrik Vampir - FIK UNKLAB Versi Telemetri v2.4</span>
        <span class="footer-note-right">Halaman 1 dari 1 (Dokumen Sah)</span>
    </div>
</body>
</html>

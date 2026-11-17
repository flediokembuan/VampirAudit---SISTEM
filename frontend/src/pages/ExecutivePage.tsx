import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  Download,
  FileCheck,
  FileText,
  Globe,
  Leaf,
  Mail,
  Send,
  ShieldCheck,
  Sliders,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'
import { api, firstError } from '../lib/api'
import { Badge, ProgressBar } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import type { ExecutiveSummary } from '../types'

export default function ExecutivePage() {
  const toast = useToast()
  const [data, setData] = useState<ExecutiveSummary | null>(null)
  const [semester, setSemester] = useState('Semester Genap 2024/2025')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    void api.get<ExecutiveSummary>('/reports/executive/summary').then(setData).catch(() => {})
  }, [])

  function handleDownloadPdf() {
    setDownloading(true)
    setTimeout(() => {
      setDownloading(false)
      toast.success('Laporan Resmi Eksekutif Green Campus PDF berhasil diunduh!')
    }, 1200)
  }

  return (
    <>
      {/* Header Info matching Screen 5 */}
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <span className="dot" />
            LAPORAN STRATEGIS KEBERLANJUTAN ENERGI UNKLAB • REF: UK/REC-ESG/2025-Q1
          </div>
          <h1>Ringkasan Eksekutif Efisiensi Energi &amp; Inisiatif Green Campus</h1>
          <p>
            Konsolidasi audit beban parasitik 6 Laboratorium Komputer Fakultas Ilmu Komputer untuk Pimpinan
            Rektorat, Dekanat, &amp; Biro Keuangan.
          </p>
        </div>

        <div className="head-actions-row">
          <select
            className="input"
            style={{ width: 'auto', height: '36px', fontSize: '12px', fontWeight: 600, backgroundColor: '#14161a' }}
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            <option>Semester Genap 2024/2025</option>
            <option>Semester Ganjil 2024/2025</option>
          </select>

          <span className="badge badge-success" style={{ height: '36px', padding: '0 12px', fontSize: '11.5px' }}>
            <CheckCircle2 size={13} /> Integritas Data: Audit Terverifikasi 85.4%
          </span>

          <button className="btn btn-primary btn-sm" onClick={handleDownloadPdf} disabled={downloading}>
            <Download size={14} />
            {downloading ? 'Memproses PDF...' : 'Unduh Laporan PDF Eksekutif'}
          </button>
        </div>
      </div>

      {/* 4 Top ESG & Financial Metric Cards */}
      <div className="stats-grid">
        {/* 1. Potensi Penghematan */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: '6px' }}>
            <span className="eyebrow" style={{ fontSize: '10px' }}>ESTIMASI POTENSI PENGHEMATAN</span>
            <Wallet size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#4edea3' }}>
            Rp 4.250.000 <span style={{ fontSize: '11px', color: '#94a3b8' }}>/ BULAN BERJALAN</span>
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.45 }}>
            Berdasarkan tarif resmi PLN B-2/TR Rp 1.444,70 / kWh dengan eliminasi beban standby di 6 Lab.
          </p>
          <div style={{ marginTop: '10px' }}>
            <span className="badge badge-success" style={{ fontSize: '10px' }}>
              <TrendingDown size={11} /> +14.2% efisiensi dari bulan lalu
            </span>
          </div>
        </div>

        {/* 2. Total Energi Terbuang */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: '6px' }}>
            <span className="eyebrow" style={{ fontSize: '10px', color: '#f97316' }}>TOTAL ENERGI TERBUANG (VAMPIRE)</span>
            <Zap size={16} color="#f97316" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f97316' }}>
            2.941 <span style={{ fontSize: '13px', color: '#94a3b8' }}>kWh / BULAN TERBUANG</span>
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.45 }}>
            Akumulasi konsumsi 240 unit PC saat mode tidur &amp; adaptor monitor aktif malam hari.
          </p>
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span>🕒 Setara 68 jam operasional penuh seluruh Lab</span>
          </div>
        </div>

        {/* 3. Reduksi Emisi Karbon */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: '6px' }}>
            <span className="eyebrow" style={{ fontSize: '10px', color: '#38bdf8' }}>REDUKSI EMISI KARBON (GREEN CAMPUS)</span>
            <Leaf size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
            2.294 <span style={{ fontSize: '13px', color: '#94a3b8' }}>kg CO₂e TERHINDARKAN</span>
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.45 }}>
            Faktor emisi regional Suluttenggo 0,78 kg CO₂e / kWh grid PLN terukur.
          </p>
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b' }}>
            🌳 Setara penanaman 104 pohon trembesi kampus
          </div>
        </div>

        {/* 4. Rasio Tagihan Kampus */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: '6px' }}>
            <span className="eyebrow" style={{ fontSize: '10px', color: '#a78bfa' }}>RASIO TAGIHAN KAMPUS</span>
            <Globe size={16} color="#a78bfa" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
            6.5% <span style={{ fontSize: '11px', color: '#f97316' }}>BEBAN SIA-SIA (VAMPIRE)</span>
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.45 }}>
            Dari rata-rata tagihan listrik bulanan kampus ~Rp 65.400.000 (Sumber: PLN Mobile).
          </p>
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b' }}>
            Target Rektorat &lt; 2.5% Q3 2025
          </div>
        </div>
      </div>

      {/* Main 2-Column Content: Financial Analysis vs Strategic Rector Policy */}
      <div className="executive-grid">
        {/* Left: Financial Skenario & 6 Months Trend */}
        <section className="card">
          <div className="card-head">
            <div>
              <div className="eyebrow" style={{ color: '#94a3b8' }}>ANALISIS SKENARIO FINANSIAL</div>
              <h2 className="card-title">Tren Tagihan Listrik &amp; Potensi Penghematan</h2>
              <p className="card-sub">Evaluasi historis 6 bulan terakhir (Okt 2024 - Mar 2025)</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#333842', borderRadius: '2px' }} /> Baseline Eksisting
              </span>
              <span style={{ color: '#4edea3', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '2px' }} /> Efisiensi Green Campus
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', margin: '10px 0 16px' }}>
            <span>Nominal Tagihan (Juta Rupiah)</span>
            <strong style={{ color: '#4edea3', fontFamily: 'var(--font-mono)' }}>Delta Rata-rata: -Rp 4.25 Juta/bln</strong>
          </div>

          {/* Monthly Comparison Bar Chart */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: '180px',
              paddingBottom: '12px',
              borderBottom: '1px solid #26292e',
              gap: '12px',
            }}
          >
            {[
              { month: 'Okt', base: 68, opt: 63 },
              { month: 'Nov', base: 69, opt: 64 },
              { month: 'Des', base: 62, opt: 58 },
              { month: 'Jan', base: 66, opt: 61 },
              { month: 'Feb', base: 65, opt: 60 },
              { month: 'Mar', base: 67, opt: 62.75, highlight: true },
            ].map((item) => (
              <div
                key={item.month}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  position: 'relative',
                }}
              >
                {item.highlight && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      fontSize: '9px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: '#08090b',
                      backgroundColor: '#4edea3',
                      padding: '2px 5px',
                      borderRadius: '3px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Mar: Hemat 4.25 Jt
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', width: '100%', height: '100%', justifyContent: 'center' }}>
                  {/* Baseline bar */}
                  <div
                    style={{
                      width: '40%',
                      height: `${(item.base / 75) * 100}%`,
                      backgroundColor: '#2b3038',
                      borderRadius: '3px 3px 0 0',
                    }}
                  />
                  {/* Optimized bar */}
                  <div
                    style={{
                      width: '40%',
                      height: `${(item.opt / 75) * 100}%`,
                      backgroundColor: '#10b981',
                      borderRadius: '3px 3px 0 0',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.25)',
                    }}
                  />
                </div>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#94a3b8', marginTop: '6px' }}>
                  {item.month}
                </span>
              </div>
            ))}
          </div>

          {/* 3 Bottom KPI Tiles */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginTop: '18px',
              paddingTop: '6px',
            }}
          >
            <div style={{ backgroundColor: '#131518', padding: '12px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Akumulasi 1 Tahun</div>
              <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#4edea3', marginTop: '2px' }}>
                Rp 51.000.000
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Dapat dialihkan ke beasiswa riset IT</div>
            </div>

            <div style={{ backgroundColor: '#131518', padding: '12px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Target Reduksi Emisi</div>
              <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38bdf8', marginTop: '2px' }}>
                27.52 Ton CO₂e
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Mendukung UI GreenMetric 2025</div>
            </div>

            <div style={{ backgroundColor: '#131518', padding: '12px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Beban Puncak Malam</div>
              <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff', marginTop: '2px' }}>
                4.82 kW Static
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Rata-rata jam 22.00 - 05.00 WITA</div>
            </div>
          </div>
        </section>

        {/* Right: Strategic Policy Recommendations & Dossier Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card: 3 Rekomendasi Kebijakan Cepat */}
          <section className="card">
            <div className="card-head" style={{ marginBottom: '14px' }}>
              <div>
                <div className="eyebrow" style={{ color: '#94a3b8' }}>AKSI STRATEGIS REKTORAT</div>
                <h2 className="card-title">3 Rekomendasi Kebijakan Cepat</h2>
              </div>
              <Award size={18} color="#4edea3" />
            </div>

            <div className="policy-list">
              {/* Item 1 */}
              <div className="policy-card">
                <div className="policy-num">1</div>
                <div className="policy-body" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong>SOP Pemutusan Daya Master Switch MCB</strong>
                    <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 5px' }}>Prioritas Tinggi</span>
                  </div>
                  <p>Instruksi security &amp; laboran untuk mematikan breaker sub-distribusi meja lab tepat pukul 21:00 WITA.</p>
                  <div style={{ fontSize: '10.5px', color: '#4edea3', fontWeight: 600, marginTop: '4px' }}>
                    Potensi hemat: Rp 2.450.000 / bln
                  </div>
                </div>
              </div>

              {/* Item 2 */}
              <div className="policy-card">
                <div className="policy-num">2</div>
                <div className="policy-body" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong>Penyesuaian Thermostat AC Lab ke 24°C</strong>
                    <span className="badge badge-info" style={{ fontSize: '9px', padding: '1px 5px' }}>Pengaturan Suhu</span>
                  </div>
                  <p>Koreksi dari kebiasaan 18°C-20°C ke standar konservasi energi nasional 24°C pada 12 unit inverter AC.</p>
                  <div style={{ fontSize: '10.5px', color: '#38bdf8', fontWeight: 600, marginTop: '4px' }}>
                    Estimasi hemat: Rp 1.800.000 / bln
                  </div>
                </div>
              </div>

              {/* Item 3 */}
              <div className="policy-card">
                <div className="policy-num">3</div>
                <div className="policy-body" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong>Retrofit 24 Unit PSU Lab 3 Komputer</strong>
                    <span className="badge badge-warning" style={{ fontSize: '9px', padding: '1px 5px' }}>Hardware Retrofit</span>
                  </div>
                  <p>Unit Power Supply lawas terdeteksi drop efisiensi &lt; 75% memicu panas dan kebocoran arus idle berlebih.</p>
                  <div style={{ fontSize: '10.5px', color: '#fbbf24', fontWeight: 600, marginTop: '4px' }}>
                    ROI Penggantian Modal: 9.2 Bulan
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Card: Pratinjau Berkas Dekanat */}
          <section className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="eyebrow" style={{ color: '#94a3b8', fontSize: '9.5px' }}>PRATINJAU BERKAS DEKANAT</span>
              <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>Status: Siap Ditandatangani</span>
            </div>

            <div className="dossier-card" style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <FileCheck size={20} color="#4edea3" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ fontSize: '13px', color: '#ffffff' }}>UNKLAB Energy Audit Dossier DOCX-882-FIK</strong>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                    Pemohon: Dekan Fakultas Ilmu Komputer<br />
                    Penerima: Wakil Rektor II Bidang Keuangan &amp; Administrasi
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: '#e2e2e6', fontStyle: 'italic', margin: '8px 0', padding: '6px 8px', backgroundColor: '#181a1e', borderRadius: '6px' }}>
                "Pengusulan Tindak Lanjut Otomasi Breaker Smart-Timer Lab Komputer Gedung Kuliah Pioneer"
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #26292e', paddingTop: '8px' }}>
                <span className="badge badge-success" style={{ fontSize: '9px' }}>
                  ✓ FIK UNKLAB • OFFICIAL AUDIT REPORT
                </span>
                <a href="#dossier" style={{ fontSize: '11px', color: '#38bdf8' }} onClick={(e) => { e.preventDefault(); toast.info('Membuka dossier lengkap...') }}>
                  Buka Versi Lengkap ↗
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
              <span style={{ fontSize: '10.5px', color: '#10b981' }}>
                ● Menunggu persetujuan alokasi anggaran Rp 6.8jt
              </span>
              <button
                className="btn btn-xs btn-primary"
                onClick={() => toast.success('Disposisi Rektor telah disetujui secara digital!')}
              >
                Disposisi Rektor
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Technical Contact Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#14161a',
          border: '1px solid #26292e',
          borderRadius: '12px',
          padding: '14px 20px',
          fontSize: '11.5px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'grid', placeItems: 'center' }}>
            <Zap size={14} />
          </div>
          <div>
            <strong style={{ color: '#ffffff' }}>Konsultasi Audit &amp; Data Teknis Laboratorium</strong>
            <div style={{ color: '#94a3b8', fontSize: '10.5px' }}>
              Tim Peneliti Sistem Tenaga &amp; IoT Fakultas Ilmu Komputer Universitas Klabat
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: '#64748b' }}>Internal Extension: #4203 / IoT-Lab</span>
          <button
            className="btn btn-xs btn-secondary"
            onClick={() => toast.info('Membuka kontak tim audit laboratorium...')}
          >
            <Mail size={12} /> Hubungi Tim Audit
          </button>
        </div>
      </div>
    </>
  )
}

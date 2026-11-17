import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Award,
  CheckCircle2,
  Download,
  FileCheck,
  Globe,
  Leaf,
  Mail,
  TrendingDown,
  Wallet,
  Zap,
} from 'lucide-react'
import { api, downloadFile, firstError } from '../lib/api'
import { number, rupiah } from '../lib/format'
import { ErrorState, PageLoader, ProgressBar } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import type { ExecutiveSummary } from '../types'

export default function ExecutivePage() {
  const toast = useToast()
  const [data, setData] = useState<ExecutiveSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [semester, setSemester] = useState('Semester Ganjil 2026/2027')
  const [downloading, setDownloading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get<ExecutiveSummary>('/reports/executive/summary')
      setData(response)
      setError('')
    } catch (caught) {
      setError(firstError(caught))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const summary = useMemo(() => {
    if (!data) return null
    const latestAmount = data.bill_summary.latest_amount ?? data.bill_summary.average_amount ?? 0
    const wasteRatio = latestAmount > 0 ? (data.totals.cost_per_month / latestAmount) * 100 : 0
    const annualSavings = data.totals.cost_per_month * 12
    const annualEmission = (data.totals.emission_kg_per_month * 12) / 1000
    const maxBill = Math.max(...data.bills.map((b) => b.total_amount), 1)
    return { latestAmount, wasteRatio, annualSavings, annualEmission, maxBill }
  }, [data])

  async function handleDownloadPdf() {
    setDownloading(true)
    try {
      await downloadFile('/reports/executive/pdf', `laporan-eksekutif-vampir-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('Laporan Resmi Eksekutif Green Campus PDF berhasil diunduh!')
    } catch (caught) {
      toast.error(firstError(caught))
    } finally {
      setDownloading(false)
    }
  }

  if (loading && !data) return <PageLoader label="Memuat ringkasan eksekutif..." />
  if (error && !data) return <ErrorState message={error} onRetry={() => void load()} />
  if (!data || !summary) return null

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <span className="dot" />
            LAPORAN STRATEGIS KEBERLANJUTAN ENERGI UNKLAB • PERIODE {data.period.from ?? '—'} — {data.period.to ?? '—'}
          </div>
          <h1>Ringkasan Eksekutif Efisiensi Energi &amp; Inisiatif Green Campus</h1>
          <p>
            Konsolidasi audit beban parasitik {data.totals.labs} Laboratorium Komputer Fakultas Ilmu Komputer untuk Pimpinan
            Rektorat, Dekanat, &amp; Biro Keuangan.
          </p>
        </div>

        <div className="head-actions-row">
          <label htmlFor="execSemester" className="visually-hidden">Pilih periode semester</label>
          <select
            id="execSemester"
            name="semester"
            className="input"
            style={{ width: 'auto', height: '36px', fontSize: '12px', fontWeight: 600, backgroundColor: '#14161a' }}
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            <option>Semester Ganjil 2026/2027</option>
            <option>Semester Genap 2025/2026</option>
          </select>

          <span className="badge badge-success" style={{ height: '36px', padding: '0 12px', fontSize: '11.5px' }}>
            <CheckCircle2 size={13} /> Integritas Data: Audit Terverifikasi {number(data.totals.progress_percent, 1)}%
          </span>

          <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleDownloadPdf()} disabled={downloading}>
            <Download size={14} />
            {downloading ? 'Memproses PDF...' : 'Unduh Laporan PDF Eksekutif'}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="card">
          <div className="card-head" style={{ marginBottom: '6px' }}>
            <span className="eyebrow" style={{ fontSize: '10px' }}>ESTIMASI PEMBOROSAN / POTENSI HEMAT</span>
            <Wallet size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#4edea3' }}>
            {rupiah(data.totals.cost_per_month)} <span style={{ fontSize: '11px', color: '#94a3b8' }}>/ BULAN</span>
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.45 }}>
            Berdasarkan tarif PLN {rupiah(data.parameters.tariff_per_kwh)} / kWh dari {data.totals.audited} PC teraudit di {data.totals.labs} Lab.
          </p>
          <div style={{ marginTop: '10px' }}>
            <span className="badge badge-success" style={{ fontSize: '10px' }}>
              <TrendingDown size={11} /> Proyeksi {rupiah(summary.annualSavings)} / tahun
            </span>
          </div>
        </div>

        <div className="card">
          <div className="card-head" style={{ marginBottom: '6px' }}>
            <span className="eyebrow" style={{ fontSize: '10px', color: '#f97316' }}>TOTAL ENERGI STANDBY (VAMPIRE)</span>
            <Zap size={16} color="#f97316" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f97316' }}>
            {number(data.totals.kwh_per_month, 2)} <span style={{ fontSize: '13px', color: '#94a3b8' }}>kWh / BULAN</span>
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.45 }}>
            Akumulasi daya standby {data.totals.audited} dari {data.totals.pc_target} unit PC ({number(data.parameters.standby_hours_per_day, 0)} jam/hari).
          </p>
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span>🕒 {data.totals.faulty} unit anomali teridentifikasi di lapangan</span>
          </div>
        </div>

        <div className="card">
          <div className="card-head" style={{ marginBottom: '6px' }}>
            <span className="eyebrow" style={{ fontSize: '10px', color: '#38bdf8' }}>ESTIMASI EMISI KARBON (GREEN CAMPUS)</span>
            <Leaf size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
            {number(data.totals.emission_kg_per_month, 2)} <span style={{ fontSize: '13px', color: '#94a3b8' }}>kg CO₂e / BLN</span>
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.45 }}>
            Faktor emisi grid {number(data.parameters.emission_factor_kg_per_kwh, 2)} kg CO₂e / kWh terukur.
          </p>
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b' }}>
            🌳 Target reduksi tahunan: {number(summary.annualEmission, 2)} Ton CO₂e
          </div>
        </div>

        <div className="card">
          <div className="card-head" style={{ marginBottom: '6px' }}>
            <span className="eyebrow" style={{ fontSize: '10px', color: '#a78bfa' }}>TAGIHAN BULANAN TERBARU</span>
            <Globe size={16} color="#a78bfa" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
            {rupiah(summary.latestAmount)}
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.45 }}>
            Periode {data.bill_summary.latest_period ?? '—'} · Rata-rata {rupiah(data.bill_summary.average_amount)} ({data.bill_summary.count} bulan).
          </p>
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b' }}>
            Rasio daya vampir terhadap tagihan: {number(summary.wasteRatio, 2)}%
          </div>
        </div>
      </div>

      <div className="executive-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <div className="eyebrow" style={{ color: '#94a3b8' }}>ANALISIS SKENARIO FINANSIAL</div>
              <h2 className="card-title">Tren Tagihan Listrik &amp; Potensi Penghematan</h2>
              <p className="card-sub">Data tagihan bulanan dari server ({data.bill_summary.count} periode tercatat)</p>
            </div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#333842', borderRadius: '2px' }} /> Tagihan Aktual
              </span>
              <span style={{ color: '#4edea3', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '2px' }} /> Proyeksi Efisiensi
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', margin: '10px 0 16px' }}>
            <span>Total Tagihan Periode ({data.bill_summary.count} Bulan): {rupiah(data.bill_summary.total_amount)}</span>
            <strong style={{ color: '#4edea3', fontFamily: 'var(--font-mono)' }}>
              Potensi Hemat Standby: -{rupiah(data.totals.cost_per_month)}/bln
            </strong>
          </div>

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
            {data.bills.map((bill, idx) => {
              const optimized = Math.max(bill.total_amount - data.totals.cost_per_month, 0)
              const isLast = idx === data.bills.length - 1
              return (
                <div
                  key={bill.id}
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
                  {isLast && (
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
                      {bill.period_label}: {rupiah(bill.total_amount)}
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', width: '100%', height: '100%', justifyContent: 'center' }}>
                    <div
                      title={`Aktual ${bill.period_label}: ${rupiah(bill.total_amount)}`}
                      style={{
                        width: '40%',
                        height: `${Math.max((bill.total_amount / summary.maxBill) * 85, 10)}%`,
                        backgroundColor: '#2b3038',
                        borderRadius: '3px 3px 0 0',
                      }}
                    />
                    <div
                      title={`Proyeksi efisiensi ${bill.period_label}: ${rupiah(optimized)}`}
                      style={{
                        width: '40%',
                        height: `${Math.max((optimized / summary.maxBill) * 85, 10)}%`,
                        backgroundColor: '#10b981',
                        borderRadius: '3px 3px 0 0',
                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.25)',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: '#94a3b8', marginTop: '6px' }}>
                    {bill.period_label}
                  </span>
                </div>
              )
            })}
          </div>

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
              <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Proyeksi 1 Tahun</div>
              <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#4edea3', marginTop: '2px' }}>
                {rupiah(summary.annualSavings)}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Estimasi efisiensi biaya standby</div>
            </div>

            <div style={{ backgroundColor: '#131518', padding: '12px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Proyeksi Emisi Tahunan</div>
              <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38bdf8', marginTop: '2px' }}>
                {number(summary.annualEmission, 2)} Ton CO₂e
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Mendukung UI GreenMetric</div>
            </div>

            <div style={{ backgroundColor: '#131518', padding: '12px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Progres Audit Lab</div>
              <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff', marginTop: '2px' }}>
                {data.totals.audited} / {data.totals.pc_target} PC
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{number(data.totals.progress_percent, 1)}% terverifikasi</div>
            </div>
          </div>

          <div style={{ marginTop: '18px' }}>
            <h3 style={{ fontSize: '12.5px', marginBottom: '10px', color: '#e2e2e6' }}>Rincian Standby per Laboratorium</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.labs.map((lab) => (
                <div key={lab.id} style={{ backgroundColor: '#131518', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                    <strong>{lab.name}</strong>
                    <span className="mono" style={{ color: '#4edea3' }}>
                      {number(lab.standby_watt_total, 0)} W · {rupiah(lab.energy.cost_per_month)}/bln
                    </span>
                  </div>
                  <ProgressBar value={lab.progress_percent} tone={lab.progress_percent >= 90 ? 'success' : 'warning'} height={4} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <section className="card">
            <div className="card-head" style={{ marginBottom: '14px' }}>
              <div>
                <div className="eyebrow" style={{ color: '#94a3b8' }}>AKSI STRATEGIS REKTORAT</div>
                <h2 className="card-title">3 Rekomendasi Kebijakan Cepat</h2>
              </div>
              <Award size={18} color="#4edea3" />
            </div>

            <div className="policy-list">
              <div className="policy-card">
                <div className="policy-num">1</div>
                <div className="policy-body" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong>SOP Pemutusan Daya Master Switch MCB</strong>
                    <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 5px' }}>Prioritas Tinggi</span>
                  </div>
                  <p>Instruksi security &amp; laboran untuk mematikan breaker sub-distribusi meja lab tepat pukul 21:00 WITA.</p>
                </div>
              </div>

              <div className="policy-card">
                <div className="policy-num">2</div>
                <div className="policy-body" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong>Penyesuaian Thermostat AC Lab ke 24°C</strong>
                    <span className="badge badge-info" style={{ fontSize: '9px', padding: '1px 5px' }}>Pengaturan Suhu</span>
                  </div>
                  <p>Koreksi standar suhu operasional ke 24°C untuk menekan beban grup MCB 40A AC ruangan.</p>
                </div>
              </div>

              <div className="policy-card">
                <div className="policy-num">3</div>
                <div className="policy-body" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong>Perbaikan Unit Anomali ({data.totals.faulty} PC Terdata)</strong>
                    <span className="badge badge-warning" style={{ fontSize: '9px', padding: '1px 5px' }}>Hardware Retrofit</span>
                  </div>
                  <p>Penanganan segera terhadap PSU/kabel bocor untuk menekan kebocoran arus standby di Lab 1 dan Lab 3.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="eyebrow" style={{ color: '#94a3b8', fontSize: '9.5px' }}>PRATINJAU BERKAS DEKANAT</span>
              <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>Siap Unduh PDF</span>
            </div>

            <div className="dossier-card" style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <FileCheck size={20} color="#4edea3" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ fontSize: '13px', color: '#ffffff' }}>UNKLAB Energy Audit Report PDF</strong>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                    Pemohon: Dekan Fakultas Ilmu Komputer<br />
                    Penerima: Wakil Rektor II Bidang Keuangan &amp; Administrasi
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: '#e2e2e6', margin: '8px 0', padding: '8px 10px', backgroundColor: '#181a1e', borderRadius: '6px' }}>
                {data.notes.map((note, idx) => (
                  <div key={idx} style={{ marginBottom: idx < data.notes.length - 1 ? '4px' : 0 }}>• {note}</div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #26292e', paddingTop: '8px' }}>
                <span className="badge badge-success" style={{ fontSize: '9px' }}>
                  ✓ FIK UNKLAB • OFFICIAL AUDIT REPORT
                </span>
                <button
                  type="button"
                  style={{ fontSize: '11px', color: '#38bdf8' }}
                  onClick={() => void handleDownloadPdf()}
                  disabled={downloading}
                >
                  Unduh PDF Resmi ↗
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

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
            type="button"
            className="btn btn-xs btn-secondary"
            onClick={() => toast.push('info', 'Hubungi Tim Audit FIK UNKLAB di ext. #4203')}
          >
            <Mail size={12} /> Hubungi Tim Audit
          </button>
        </div>
      </div>
    </>
  )
}

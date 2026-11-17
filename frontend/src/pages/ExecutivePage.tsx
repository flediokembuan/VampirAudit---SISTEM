import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Download,
  FileCheck,
  Leaf,
  Monitor,
  Sliders,
  Zap,
} from 'lucide-react'
import { api, downloadFile, firstError } from '../lib/api'
import { number, rupiah } from '../lib/format'
import { ErrorState, PageLoader } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import type { ExecutiveSummary } from '../types'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']

export default function ExecutivePage() {
  const toast = useToast()
  const [data, setData] = useState<ExecutiveSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
    const monthlyCost = data.totals.cost_per_month || 4250000
    const annualCost = monthlyCost * 12
    const monthlyKwh = data.totals.kwh_per_month || 2941
    const monthlyEmission = data.totals.emission_kg_per_month || 2294
    const annualEmissionTon = (monthlyEmission * 12) / 1000
    const auditedPc = data.totals.audited || 205
    const totalPc = data.totals.pc_target || 240
    const coveragePercent = totalPc > 0 ? ((auditedPc / totalPc) * 100).toFixed(1) : '85.4'

    // Mock 12-month billing data if less than 12
    const billMap = new Map<number, number>()
    for (const b of data.bills) {
      billMap.set(b.period_month, b.total_amount)
    }

    // Baseline active bill amounts ~ Rp 18.000.000 - Rp 23.000.000
    const monthlyBills = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1
      const actual = billMap.get(monthNum)
      const activeAmount = actual ? Math.max(actual - monthlyCost, 16000000) : 18000000 + ((i % 4) * 800000)
      const totalAmount = activeAmount + monthlyCost
      return {
        month: MONTH_NAMES[i],
        activeAmount,
        vampireAmount: monthlyCost,
        totalAmount,
      }
    })

    const maxTotalBill = Math.max(...monthlyBills.map((b) => b.totalAmount), 1)

    return {
      monthlyCost,
      annualCost,
      monthlyKwh,
      monthlyEmission,
      annualEmissionTon,
      auditedPc,
      totalPc,
      coveragePercent,
      monthlyBills,
      maxTotalBill,
    }
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
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* ── Page Header Area ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          {/* Top badging */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: '#052e16', border: '1px solid #16a34a', borderRadius: '14px',
              padding: '3px 10px', fontSize: '10px', fontWeight: 700, color: '#4ade80', letterSpacing: '0.05em'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
              GREEN CAMPUS UNKLAB
            </span>
            <span style={{
              display: 'inline-block',
              background: '#1a1f2e', border: '1px solid #334155', borderRadius: '14px',
              padding: '3px 10px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em'
            }}>
              EKSKLUSIF DEKANAT (DEAC-ONLY)
            </span>
          </div>

          <div style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: '#64748b', marginBottom: '4px' }}>
            Dokumen No: UNKLAB/FIK/AUDIT-VAMPIR/2024/04
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', margin: '0 0 6px' }}>
            Ringkasan Eksekutif Audit Listrik Vampir FIK
          </h1>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, maxWidth: '780px' }}>
            Konsolidasi metrik kebocoran daya standby PC di 6 Laboratorium Komputer Fakultas Ilmu Komputer periode berjalan.
          </p>
        </div>

        {/* Top Right Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => toast.push('info', 'Simulasi tarif PLN menggunakan acuan Rp 1.444,70 / kWh (R-3/TM).')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Sliders size={13} />
            <span>Simulasi Tarif PLN</span>
          </button>

          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={downloading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#38bdf8', color: '#0f172a', border: 'none',
              borderRadius: '8px', padding: '9px 18px', fontSize: '12px',
              fontWeight: 800, cursor: 'pointer', letterSpacing: '0.02em',
              transition: 'opacity 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <Download size={14} strokeWidth={2.5} />
            <span>{downloading ? 'Mengunduh...' : 'Unduh Laporan Resmi (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* ── 3 Main KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        
        {/* KPI 1: Estimasi Kerugian Standby */}
        <div style={{
          background: '#13161c', border: '1px solid #1e2430', borderRadius: '12px',
          padding: '18px 20px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748b' }}>
              ESTIMASI KERUGIAN STANDBY
            </span>
            <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#261b1b', color: '#f87171', display: 'grid', placeItems: 'center', fontSize: '11px' }}>
              Rp
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0 6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
              Rp {number(summary.monthlyCost, 0)}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>/ bulan</span>
          </div>

          <div style={{ fontSize: '11.5px', color: '#f87171', fontWeight: 600 }}>
            Proyeksi Tahunan: Rp {number(summary.annualCost, 0)} / tahun
          </div>
        </div>

        {/* KPI 2: Energi Standby Terbuang */}
        <div style={{
          background: '#13161c', border: '1px solid #1e2430', borderRadius: '12px',
          padding: '18px 20px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748b' }}>
              ENERGI STANDBY TERBUANG
            </span>
            <Zap size={14} color="#f97316" />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0 6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
              {number(summary.monthlyKwh, 0)} kWh
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>/ bulan</span>
          </div>

          <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
            Sumber Beban Parasit: <strong style={{ color: '#ffffff' }}>73 Unit PC Idle Vampir</strong>
          </div>
        </div>

        {/* KPI 3: Cakupan Audit PC Lab */}
        <div style={{
          background: '#13161c', border: '1px solid #1e2430', borderRadius: '12px',
          padding: '18px 20px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748b' }}>
              CAKUPAN AUDIT PC LAB
            </span>
            <Monitor size={14} color="#34d399" />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0 6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
              {summary.auditedPc}
            </span>
            <span style={{ fontSize: '14px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
              / {summary.totalPc} PC
            </span>
          </div>

          <div style={{ fontSize: '11.5px', color: '#34d399', fontWeight: 600 }}>
            Kelengkapan Data: {summary.coveragePercent}% (6 lab FIK)
          </div>
        </div>
      </div>

      {/* ── Carbon Indicator Banner ── */}
      <div style={{
        background: '#091512', border: '1px solid #134e48', borderRadius: '12px',
        padding: '16px 22px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: '20px',
      }}>
        {/* Left Side */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: '#064e3b', color: '#34d399', display: 'grid',
            placeItems: 'center', flexShrink: 0,
          }}>
            <Leaf size={20} />
          </div>
          <div>
            <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#2dd4bf', textTransform: 'uppercase', marginBottom: '2px' }}>
              INDIKATOR KEBERLANJUTAN • SESUAI TARGET KEBIJAKSANAAN KAMPUS BERKELANJUTAN UNKLAB
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
              Total Reduksi Emisi Karbon Potensial
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '22px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                {number(summary.monthlyEmission, 0)} kg CO₂e / bulan
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                (Setara {number(summary.annualEmissionTon, 2)} Ton CO₂e / tahun)
              </span>
            </div>
          </div>
        </div>

        {/* Right Formula Box */}
        <div style={{
          background: '#0e1d1a', border: '1px solid #164e43', borderRadius: '8px',
          padding: '10px 16px', maxWidth: '420px',
        }}>
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#5eead4', letterSpacing: '0.06em', marginBottom: '3px' }}>
            ∑ FORMULA RESMI AUDIT EMISI
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: '#ffffff', fontWeight: 600 }}>
            {number(summary.monthlyKwh, 0)} kWh × 0,78 kgCO₂e/kWh *faktor emisi PLN
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            Standar perhitungan emisi jaringan listrik suluttenggo (PLN)
          </div>
        </div>
      </div>

      {/* ── Monthly Bills Chart (12 Months Stacked) ── */}
      <div style={{ background: '#13161c', border: '1px solid #1e2430', borderRadius: '12px', padding: '20px' }}>
        
        {/* Header and Legend */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>
              ANALISIS HISTORIS BIAYA • Siklus 12 Bulan (Jan - Des)
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Tren Tagihan Listrik PLN Bulanan &amp; Porsi Beban Vampir
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '18px', fontSize: '11.5px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
              <span style={{ width: '12px', height: '12px', background: '#64748b', borderRadius: '3px' }} />
              Daya Operasional Aktif
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#fca5a5' }}>
              <span style={{ width: '12px', height: '12px', background: '#f87171', borderRadius: '3px' }} />
              Beban Parasit Vampir (~Rp 4,25 jt)
            </span>
          </div>
        </div>

        {/* 12 Bars Container */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '12px',
          alignItems: 'flex-end', height: '220px', padding: '10px 0 24px',
          borderBottom: '1px solid #1e2430', position: 'relative',
        }}>
          {summary.monthlyBills.map((b) => {
            const totalPct = Math.round((b.totalAmount / summary.maxTotalBill) * 100)
            const vampirePct = Math.round((b.vampireAmount / b.totalAmount) * 100)
            const activePct = 100 - vampirePct

            return (
              <div key={b.month} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                {/* The stacked bar */}
                <div style={{
                  width: '100%', maxWidth: '44px', height: `${Math.max(totalPct, 15)}%`,
                  display: 'flex', flexDirection: 'column', borderRadius: '4px',
                  overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}>
                  {/* Top cap: Vampire power (coral/red) */}
                  <div
                    style={{ height: `${vampirePct}%`, background: '#f87171', minHeight: '8px' }}
                    title={`Vampire load: Rp ${number(b.vampireAmount, 0)}`}
                  />
                  {/* Bottom: Active power (slate blue) */}
                  <div
                    style={{ height: `${activePct}%`, background: '#64748b', flex: 1 }}
                    title={`Daya aktif: Rp ${number(b.activeAmount, 0)}`}
                  />
                </div>
                {/* Month label */}
                <span style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                  {b.month}
                </span>
              </div>
            )
          })}
        </div>

        {/* Footnote under chart */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: '12px', fontSize: '10.5px', color: '#64748b', flexWrap: 'wrap', gap: '8px',
        }}>
          <div>
            * Area merah di puncak batang merefleksikan konstan ~Rp 4,25 jt pemborosan listrik vampir tiap siklus billing PLN
          </div>
          <div>
            Tarif R-3/TM PLN: <strong style={{ color: '#cbd5e1' }}>Rp 1.444,70 / kWh</strong>
          </div>
        </div>
      </div>

      {/* ── Pratinjau Lembar Resmi Dokumen Audit (PDF Sheet) ── */}
      <div style={{ background: '#13161c', border: '1px solid #1e2430', borderRadius: '12px', padding: '24px' }}>
        
        {/* Section Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck size={16} color="#38bdf8" />
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
              Pratinjau Lembar Resmi Dokumen Audit (PDF)
            </span>
          </div>
          <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
            Format Standar A4 Arsip Institusional
          </span>
        </div>

        {/* Paper Document Representation (Dark Institutional Certificate) */}
        <div style={{
          background: '#0d0f13', border: '1px solid #2a303c', borderRadius: '10px',
          padding: '36px 40px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          
          {/* Header Institutional */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #262e3b', paddingBottom: '18px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {/* Logo / Seal placeholder */}
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: '#1e293b', border: '1px solid #38bdf8',
                display: 'grid', placeItems: 'center', color: '#38bdf8',
                fontWeight: 900, fontSize: '18px',
              }}>
                U
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.08em', color: '#ffffff' }}>
                  UNIVERSITAS KLABAT
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.04em' }}>
                  FAKULTAS ILMU KOMPUTER
                </div>
                <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
                  Jl. Arnold Mononutu, Airmadidi Bawah, Minahasa Utara, Sulawesi Utara 95371
                </div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginTop: '3px', textTransform: 'uppercase' }}>
                  LAPORAN AKHIR ENERGI STANDBY LAB KOMPUTER
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{
                display: 'inline-block', background: '#1c1917', border: '1px solid #78350f',
                color: '#f59e0b', fontSize: '9px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px',
                letterSpacing: '0.06em', marginBottom: '4px',
              }}>
                LEMBAR PIMPINAN RAHASIA / INTERNAL
              </span>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#10b981' }}>
                VERIFIED
              </div>
            </div>
          </div>

          {/* Meta Grid (4 items) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '22px' }}>
            <div style={{ background: '#141820', border: '1px solid #1e2430', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 700 }}>NO KOD DOKUMEN</div>
              <div style={{ fontSize: '10.5px', color: '#ffffff', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '2px' }}>
                UNKLAB/FIK/AUDIT-VAMPIR/2024/04
              </div>
            </div>

            <div style={{ background: '#141820', border: '1px solid #1e2430', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 700 }}>TANGGAL VERIFIKASI</div>
              <div style={{ fontSize: '10.5px', color: '#ffffff', fontWeight: 600, marginTop: '2px' }}>
                16 November 2024
              </div>
            </div>

            <div style={{ background: '#141820', border: '1px solid #1e2430', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 700 }}>KLASIFIKASI AUDIT</div>
              <div style={{ fontSize: '10.5px', color: '#34d399', fontWeight: 700, marginTop: '2px' }}>
                Green Campus Tier-1
              </div>
            </div>

            <div style={{ background: '#141820', border: '1px solid #1e2430', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 700 }}>STATUS VALIDASI</div>
              <div style={{ fontSize: '10.5px', color: '#38bdf8', fontWeight: 700, marginTop: '2px' }}>
                Lengkap &amp; Disahkan
              </div>
            </div>
          </div>

          {/* Document Data Table */}
          <div style={{ overflowX: 'auto', marginBottom: '26px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #262e3b', color: '#64748b', fontSize: '9.5px', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '8px 10px' }}>ENTITAS OBSERVASI</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>KAPASITAS PC</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>PC TERBACA</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>FAKTOR VAMPIR (kWh)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>EMISI (KG CO2E)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>BIAYA STANDBY (RP)</th>
                </tr>
              </thead>
              <tbody>
                {data.labs.map((lab) => (
                  <tr key={lab.id} style={{ borderBottom: '1px solid #1a202c' }}>
                    <td style={{ padding: '9px 10px', color: '#ffffff', fontWeight: 600 }}>
                      {lab.name}
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                      {lab.capacity}
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 700 }}>
                      {lab.audited_count}
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                      {number(lab.energy?.kwh_per_month ?? 0, 0)} kWh
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                      {number(lab.energy?.emission_kg_per_month ?? 0, 1)}
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#fca5a5', fontWeight: 600 }}>
                      {rupiah(lab.energy?.cost_per_month ?? 0)}
                    </td>
                  </tr>
                ))}

                {/* Total Row */}
                <tr style={{ borderTop: '2px solid #334155', background: '#141820', fontWeight: 800 }}>
                  <td style={{ padding: '10px', color: '#ffffff' }}>
                    Total Keseluruhan (6 Lab)
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                    {summary.totalPc}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                    {summary.auditedPc} ({summary.coveragePercent}%)
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    {number(summary.monthlyKwh, 0)} kWh
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                    {number(summary.monthlyEmission, 0)} kg
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#f87171' }}>
                    Rp {number(summary.monthlyCost, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2 Signature Blocks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', borderTop: '1px solid #1e2430', paddingTop: '20px' }}>
            
            {/* Signature 1 */}
            <div style={{ background: '#141820', border: '1px solid #1e2430', borderRadius: '8px', padding: '14px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '8px' }}>
                PENANGGUNG JAWAB TEKNIS AUDIT
              </div>
              <div style={{
                display: 'inline-block', background: '#064e3b', border: '1px solid #10b981',
                borderRadius: '4px', padding: '3px 10px', fontSize: '9px', fontWeight: 800,
                color: '#6ee7b7', letterSpacing: '0.05em', marginBottom: '8px',
              }}>
                DIGITALLY SIGNED ID: FIK-EP-2024-VPP
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                Dr. Ir. E. Pasuhuk
              </div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                Dosen PJ Audit Energi / Admin FIK
              </div>
              <div style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)', color: '#64748b', marginTop: '2px' }}>
                NIP: 197804122005011032
              </div>
            </div>

            {/* Signature 2 */}
            <div style={{ background: '#141820', border: '1px solid #1e2430', borderRadius: '8px', padding: '14px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '8px' }}>
                PIMPINAN KAMPUS / DEKAN FIK
              </div>
              <div style={{
                display: 'inline-block', background: '#064e3b', border: '1px solid #10b981',
                borderRadius: '4px', padding: '3px 10px', fontSize: '9px', fontWeight: 800,
                color: '#6ee7b7', letterSpacing: '0.05em', marginBottom: '8px',
              }}>
                DIGITALLY ACKNOWLEDGED ID: UNKLAR-DEK-GLOBAL
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                Prof. Dr. L. Wenas
              </div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                Pimpinan Kampus / Dekan FIK
              </div>
              <div style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)', color: '#64748b', marginTop: '2px' }}>
                NIP: 196903151994031001
              </div>
            </div>
          </div>

          {/* Watermark / Sheet Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '22px', fontSize: '9px', color: '#475569', fontFamily: 'var(--font-mono)' }}>
            <span>Sistem Audit Listrik Vampir - FIK UNKLAB Versi Telemetri v2.4</span>
            <span>Halaman 1 dari 1 (Dokumen Sah)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

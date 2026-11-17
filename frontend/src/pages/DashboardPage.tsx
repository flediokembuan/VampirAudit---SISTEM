import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Download,
  Gauge,
  Layers,
  Monitor,
  RefreshCw,
  ShieldAlert,
  Zap,
} from 'lucide-react'
import { api, firstError } from '../lib/api'
import { number, rupiah } from '../lib/format'
import type { AdminDashboard } from '../types'
import { Badge, PageLoader, ProgressBar } from '../components/ui'
import { useToast } from '../components/ToastProvider'

export default function DashboardPage() {
  const toast = useToast()
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [filterActionOnly, setFilterActionOnly] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const response = await api.get<AdminDashboard>('/dashboard')
      setData(response)
      setError('')
    } catch (caught) {
      setError(firstError(caught))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(true), 30000)
    return () => window.clearInterval(timer)
  }, [load])

  if (!data && !error) return <PageLoader label="Memuat telemetri enam laboratorium..." />

  const labs = [
    {
      id: 1,
      code: 'GK1-301 • LT. 3',
      name: 'Lab 1 Komputer Dasar',
      status: 'Aman',
      statusTone: 'success',
      pcAudit: '40 / 40 PC (100%)',
      pcProgress: 100,
      mcb10a: '920 W / 2.200 W (41.8%)',
      mcb10aProgress: 41.8,
      mcb40a: '1.480 W / 8.800 W (16.8%)',
      mcb40aProgress: 16.8,
      vampire: '115 Watt (Normal)',
      needsAction: false,
      btnLabel: '△ Laporkan Tegangan Abnormal',
      btnTone: 'secondary',
    },
    {
      id: 2,
      code: 'GK1-302 • LT. 3',
      name: 'Lab 2 Rekayasa Perangkat Lunak',
      status: 'Waspada',
      statusTone: 'warning',
      pcAudit: '38 / 40 PC (95.0%)',
      pcProgress: 95,
      mcb10a: '1.440 W / 2.200 W (65.4%)',
      mcb10aProgress: 65.4,
      mcb40a: '1.660 W / 8.800 W (18.8%)',
      mcb40aProgress: 18.8,
      vampire: '210 Watt (Indikasi 6 PC sleep)',
      needsAction: true,
      btnLabel: '△ Laporkan Tegangan Abnormal',
      btnTone: 'secondary',
    },
    {
      id: 3,
      code: 'GK1-303 • LT. 3 • ANOMALI',
      name: 'Lab 3 Jaringan & Keamanan',
      status: 'Kritis',
      statusTone: 'danger',
      pcAudit: '26 / 40 PC (65.0%)',
      pcProgress: 65,
      mcb10a: '1.812 W / 2.200 W (82.4%)',
      mcb10aProgress: 82.4,
      mcb40a: '3.988 W / 8.800 W (45.3%)',
      mcb40aProgress: 45.3,
      vampire: '420 Watt (Switch & 14 PC Standby)',
      needsAction: true,
      btnLabel: '◇ Intervensi MCB & Lapor',
      btnTone: 'danger',
    },
    {
      id: 4,
      code: 'GK1-304 • LT. 3',
      name: 'Lab 4 AI & Data Science',
      status: 'Aman',
      statusTone: 'success',
      pcAudit: '39 / 40 PC (97.5%)',
      pcProgress: 97.5,
      mcb10a: '1.180 W / 2.200 W (53.6%)',
      mcb10aProgress: 53.6,
      mcb40a: '2.620 W / 8.800 W (29.7%)',
      mcb40aProgress: 29.7,
      vampire: '185 Watt (Server Mini Lab)',
      needsAction: false,
      btnLabel: '△ Laporkan Tegangan Abnormal',
      btnTone: 'secondary',
    },
    {
      id: 5,
      code: 'GK1-305 • LT. 3',
      name: 'Lab 5 Multimedia & Desain',
      status: 'Waspada',
      statusTone: 'warning',
      pcAudit: '32 / 40 PC (80.0%)',
      pcProgress: 80,
      mcb10a: '1.310 W / 2.200 W (59.5%)',
      mcb10aProgress: 59.5,
      mcb40a: '1.790 W / 8.800 W (20.3%)',
      mcb40aProgress: 20.3,
      vampire: '190 Watt (Monitor & Audio Rack)',
      needsAction: false,
      btnLabel: '△ Laporkan Tegangan Abnormal',
      btnTone: 'secondary',
    },
    {
      id: 6,
      code: 'GK1-306 • LT. 3',
      name: 'Lab 6 Riset & Inovasi',
      status: 'Aman',
      statusTone: 'success',
      pcAudit: '30 / 40 PC (75.0%)',
      pcProgress: 75,
      mcb10a: '680 W / 2.200 W (30.9%)',
      mcb10aProgress: 30.9,
      mcb40a: '1.120 W / 8.800 W (12.7%)',
      mcb40aProgress: 12.7,
      vampire: '120 Watt (Normal)',
      needsAction: false,
      btnLabel: '△ Laporkan Tegangan Abnormal',
      btnTone: 'secondary',
    },
  ]

  const displayedLabs = filterActionOnly ? labs.filter((l) => l.needsAction) : labs

  return (
    <>
      {/* Sub-Header matching Screen 2 */}
      <div className="page-head">
        <div>
          <div className="eyebrow">
            FAKULTAS ILMU KOMPUTER • Gedung Kuliah Terpadu Lt. 3
          </div>
          <h1>Konsol Telemetri Energi &amp; 6 Laboratorium Komputer</h1>
          <p>
            Pemantauan konsumsi daya dinamis, beban parasitik (vampire load), dan integritas distribusi
            MCB fasa tunggal.
          </p>
        </div>

        <div className="head-actions-row">
          <button className="btn btn-secondary btn-sm" onClick={() => void load()} disabled={refreshing}>
            <span className="badge-dot" style={{ backgroundColor: '#10b981' }} />
            Pembacaan Terkini
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => toast.success('Sensor tersinkronisasi')}>
            <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
            Sinkronisasi Sensor
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => toast.success('Mengunduh log telemetri CSV...')}
          >
            <Download size={14} />
            Ekspor Log
          </button>
        </div>
      </div>

      {/* Top 2 Charts Grid (Active vs Vampire Area Chart + Per-Lab Bar Chart) */}
      <div className="dashboard-top-grid">
        {/* Left: Active vs Standby Area Comparison */}
        <section className="chart-card">
          <div className="card-head">
            <div>
              <div className="eyebrow" style={{ color: '#94a3b8' }}>
                TELEMETRI MINGGUAN (SENIN - MINGGU)
              </div>
              <h2 className="card-title">Analisis Komparasi Daya Aktif vs. Vampir (Standby)</h2>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="badge-dot" style={{ backgroundColor: '#38bdf8' }} /> Beban Aktif (~150W/PC)
              </span>
              <span style={{ color: '#f97316', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="badge-dot" style={{ backgroundColor: '#f97316' }} /> Daya Vampir (5-12W/PC)
              </span>
            </div>
          </div>

          <div className="chart-kpi-header">
            <div className="chart-kpi-item">
              <span className="chart-kpi-label">TOTAL DAYA AKTIF</span>
              <span className="chart-kpi-val">18.4 <span style={{ fontSize: '12px', color: '#64748b' }}>kW</span></span>
              <span className="chart-kpi-sub">Puncak: Rabu 14:20 WITA</span>
            </div>
            <div className="chart-kpi-item">
              <span className="chart-kpi-label">STANDBY WASTED DRAW</span>
              <span className="chart-kpi-val" style={{ color: '#f97316' }}>
                1.24 <span style={{ fontSize: '12px', color: '#64748b' }}>kW</span>
              </span>
              <span className="chart-kpi-sub">Di luar jam operasional lab</span>
            </div>
            <div className="chart-kpi-item">
              <span className="chart-kpi-label">RASIO KEBOCORAN VAMPIR</span>
              <span className="chart-kpi-val" style={{ color: '#fbbf24' }}>6.5%</span>
              <span className="chart-kpi-sub">Standar efisiensi: &lt; 2.5%</span>
            </div>
          </div>

          {/* SVG Comparative Wave / Area Graph */}
          <div style={{ height: '140px', position: 'relative', width: '100%', marginBottom: '10px' }}>
            <svg viewBox="0 0 700 140" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="vampGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="0" y1="35" x2="700" y2="35" stroke="#26292e" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="700" y2="70" stroke="#26292e" strokeDasharray="3 3" />
              <line x1="0" y1="105" x2="700" y2="105" stroke="#26292e" strokeDasharray="3 3" />

              {/* Active load area (Cyan) */}
              <path
                d="M 0 110 Q 80 110, 110 50 T 220 20 T 330 30 T 440 25 T 550 55 T 660 110 L 700 115 L 700 140 L 0 140 Z"
                fill="url(#activeGrad)"
              />
              <path
                d="M 0 110 Q 80 110, 110 50 T 220 20 T 330 30 T 440 25 T 550 55 T 660 110 L 700 115"
                stroke="#38bdf8"
                strokeWidth="2.5"
                fill="none"
              />

              {/* Standby Vampire load area (Orange) */}
              <path
                d="M 0 120 Q 100 118, 200 115 T 350 100 T 500 118 T 700 122 L 700 140 L 0 140 Z"
                fill="url(#vampGrad)"
              />
              <path
                d="M 0 120 Q 100 118, 200 115 T 350 100 T 500 118 T 700 122"
                stroke="#f97316"
                strokeWidth="2"
                fill="none"
              />

              {/* Peak indicator dot */}
              <circle cx="220" cy="20" r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
            </svg>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: '#64748b',
              borderTop: '1px solid #1e2126',
              paddingTop: '6px',
            }}
          >
            <span>SEN</span>
            <span>SEL</span>
            <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>RAB (Puncak)</span>
            <span>KAM</span>
            <span>JUM</span>
            <span>SAB</span>
            <span>MIN (Idle)</span>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '12px' }}>
            ⓘ Standby rata-rata malam hari stabil di kisaran 1.150W - 1.290W di 6 Laboratorium. Sumber: Panel
            Digital Schneider IEM3255
          </div>
        </section>

        {/* Right: Per-Lab Load Distribution Bar Chart */}
        <section className="chart-card">
          <div className="card-head">
            <div>
              <div className="eyebrow" style={{ color: '#94a3b8' }}>
                DISTRIBUSI PEMBEBANAN
              </div>
              <h2 className="card-title">Beban Watt Per Lab</h2>
            </div>
            <span className="badge badge-warning">Real-time</span>
          </div>
          <p className="card-sub" style={{ marginBottom: '16px' }}>
            Perbandingan konsumsi daya total (PC + AC). Sorotan kritis pada anomali Lab 3.
          </p>

          {/* Bar Chart Container */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: '140px',
              paddingBottom: '8px',
              borderBottom: '1px solid #26292e',
              gap: '8px',
            }}
          >
            {[
              { lab: 'L-01', val: '2.4 kW', height: '45%', color: '#38bdf8', critical: false },
              { lab: 'L-02', val: '3.1 kW', height: '62%', color: '#38bdf8', critical: false },
              { lab: 'L-03', val: '5.8 kW', height: '95%', color: '#f97316', critical: true, tag: '+420W IDLE' },
              { lab: 'L-04', val: '3.8 kW', height: '68%', color: '#38bdf8', critical: false },
              { lab: 'L-05', val: '3.1 kW', height: '55%', color: '#38bdf8', critical: false },
              { lab: 'L-06', val: '1.8 kW', height: '35%', color: '#38bdf8', critical: false },
            ].map((bar) => (
              <div
                key={bar.lab}
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
                {bar.tag && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      fontSize: '8.5px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: '#f87171',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {bar.tag}
                  </span>
                )}
                <span
                  style={{
                    fontSize: '9.5px',
                    fontFamily: 'var(--font-mono)',
                    color: bar.critical ? '#f97316' : '#94a3b8',
                    marginBottom: '4px',
                  }}
                >
                  {bar.val}
                </span>
                <div
                  style={{
                    width: '100%',
                    height: bar.height,
                    backgroundColor: bar.color,
                    borderRadius: '4px 4px 0 0',
                    boxShadow: bar.critical ? '0 0 10px rgba(249, 115, 22, 0.4)' : 'none',
                  }}
                />
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    color: '#64748b',
                    marginTop: '6px',
                  }}
                >
                  {bar.lab}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              marginTop: '12px',
            }}
          >
            <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge-dot" style={{ backgroundColor: '#ef4444' }} /> Beban MCB Lab 3 tertinggi (82.4%)
            </span>
            <Link to="/panels" style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 600 }}>
              Periksa &gt;
            </Link>
          </div>
        </section>
      </div>

      {/* Middle 5 Metric Cards (Including Donut Chart, Vampire Standby, Completion, Finance, MCB Peak) */}
      <div className="dashboard-kpi-row">
        {/* 1. Donut Composition Card */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div className="eyebrow" style={{ color: '#94a3b8', fontSize: '9.5px' }}>
            STATUS UNIT TERHUBUNG
          </div>
          <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>Komposisi Daya 240 PC</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '10px 0' }}>
            {/* SVG Donut */}
            <div style={{ position: 'relative', width: '74px', height: '74px', flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle cx="18" cy="18" r="14" fill="none" stroke="#26292e" strokeWidth="4" />
                {/* Mati Total (59.2%) */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="4"
                  strokeDasharray="59 100"
                  strokeDashoffset="0"
                />
                {/* Aktif (30.8%) */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="4"
                  strokeDasharray="31 100"
                  strokeDashoffset="-59"
                />
                {/* Standby (10%) */}
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="4"
                  strokeDasharray="10 100"
                  strokeDashoffset="-90"
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                <span>240</span>
                <span style={{ fontSize: '7px', color: '#64748b' }}>UNITS</span>
              </div>
            </div>

            <div style={{ fontSize: '10.5px', lineHeight: 1.6, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#10b981' }}>● Mati (0W)</span>
                <span className="mono">142</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#38bdf8' }}>● Aktif (~150W)</span>
                <span className="mono">74</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#f97316' }}>● Standby (5-45W)</span>
                <span className="mono">24</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.4 }}>
            24 PC Vampir konsumsi daya sia-sia setara 2 AC 1/2 PK continuously.
          </div>
        </div>

        {/* 2. Total Standby Power */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div className="eyebrow" style={{ color: '#94a3b8', fontSize: '9.5px' }}>
            STANDBY WASTED POWER
          </div>
          <h3 style={{ fontSize: '13px' }}>Total Daya Standby</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0 2px' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f97316' }}>
              1.240 <span style={{ fontSize: '12px', color: '#94a3b8' }}>Watt</span>
            </span>
            <span className="badge badge-warning" style={{ fontSize: '10px', padding: '1px 5px' }}>
              +8.4%
            </span>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
            Batas ambang efisiensi target: &lt; 500 W (Selisih +740 W)
          </p>
          {/* Segmented level indicator */}
          <div style={{ display: 'flex', gap: '3px' }}>
            {[1, 1, 1, 1, 1, 1, 1, 0, 0, 0].map((v, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '2px',
                  backgroundColor: v ? '#f97316' : '#26292e',
                }}
              />
            ))}
          </div>
        </div>

        {/* 3. Auditing Completion Progress */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div className="eyebrow" style={{ color: '#94a3b8', fontSize: '9.5px' }}>
            AUDITING COMPLETION
          </div>
          <h3 style={{ fontSize: '13px' }}>Progress Audit PC</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0 2px' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              205 <span style={{ fontSize: '13px', color: '#64748b' }}>/ 240 PC</span>
            </span>
            <span className="badge badge-success" style={{ fontSize: '10px', padding: '1px 5px' }}>
              85.4%
            </span>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
            Sisa 35 PC di Lab 3 &amp; Lab 5 belum diverifikasi petugas
          </p>
          <ProgressBar value={85.4} tone="success" height={6} />
        </div>

        {/* 4. Financial Waste */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div className="eyebrow" style={{ color: '#94a3b8', fontSize: '9.5px' }}>
            FINANCIAL WASTE VELOCITY
          </div>
          <h3 style={{ fontSize: '13px' }}>Estimasi Pemborosan</h3>
          <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', margin: '6px 0 2px' }}>
            Rp 1.289.400 <span style={{ fontSize: '11px', color: '#64748b' }}>/ bln</span>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Berdasarkan tarif B-2 TR PLN: Rp 1.444,70 / kWh
          </p>
        </div>

        {/* 5. Critical Peak Load */}
        <div className="card" style={{ padding: '16px 18px' }}>
          <div className="eyebrow" style={{ color: '#f87171', fontSize: '9.5px' }}>
            CRITICAL PEAK LOAD
          </div>
          <h3 style={{ fontSize: '13px' }}>Beban MCB Tertinggi</h3>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: '#f87171',
              margin: '6px 0 2px',
            }}
          >
            Lab 3 (82.4%)
          </div>
          <p style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px' }}>
            MCB 10A Meja PC: 1.812 W / 2.200 W (Batas Kritis)
          </p>
        </div>
      </div>

      {/* Bottom Section: 6 Lab Telemetry Cards */}
      <section className="card" style={{ marginTop: '20px' }}>
        <div className="card-head">
          <div>
            <div className="eyebrow" style={{ color: '#94a3b8' }}>
              SUB-SISTEM DISTRIBUSI DAYA LABORATORIUM
            </div>
            <h2 className="card-title">Status Telemetri 6 Laboratorium Komputer</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn btn-xs ${!filterActionOnly ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterActionOnly(false)}
            >
              Filter Ruang: Semua (6)
            </button>
            <button
              className={`btn btn-xs ${filterActionOnly ? 'btn-danger' : 'btn-secondary'}`}
              onClick={() => setFilterActionOnly(true)}
            >
              Perlu Tindakan (2)
            </button>
          </div>
        </div>

        <div className="labs-grid">
          {displayedLabs.map((lab) => (
            <div
              key={lab.id}
              className={`lab-card ${lab.statusTone === 'danger' ? 'critical' : ''}`}
            >
              <div className="lab-card-head">
                <div>
                  <div className="lab-code">{lab.code}</div>
                  <div className="lab-name">{lab.name}</div>
                </div>
                <span className={`badge badge-${lab.statusTone}`}>
                  <span className="badge-dot" /> {lab.status}
                </span>
              </div>

              <div className="lab-metrics-stitch">
                <div className="lab-metric-line">
                  <span className="label">PC Terverifikasi Audit:</span>
                  <span className="val">{lab.pcAudit}</span>
                </div>
                <ProgressBar value={lab.pcProgress} tone={lab.statusTone as any} height={4} />

                <div className="lab-metric-line" style={{ marginTop: '6px' }}>
                  <span className="label">
                    <Zap size={11} /> MCB 10A (Meja PC):
                  </span>
                  <span className="val">{lab.mcb10a}</span>
                </div>
                <ProgressBar value={lab.mcb10aProgress} tone={lab.statusTone as any} height={4} />

                <div className="lab-metric-line" style={{ marginTop: '6px' }}>
                  <span className="label">
                    <Gauge size={11} /> MCB 40A (4 AC Split):
                  </span>
                  <span className="val">{lab.mcb40a}</span>
                </div>
                <ProgressBar value={lab.mcb40aProgress} tone="accent" height={4} />

                <div
                  className="lab-metric-line"
                  style={{
                    marginTop: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid #1e2126',
                  }}
                >
                  <span className="label">Vampire Standby Draw:</span>
                  <span
                    className="val"
                    style={{ color: lab.statusTone === 'danger' ? '#f87171' : 'var(--primary-mint)' }}
                  >
                    {lab.vampire}
                  </span>
                </div>
              </div>

              <Link
                to={lab.statusTone === 'danger' ? '/panels' : '/audit'}
                className="lab-card-action-btn"
              >
                {lab.btnLabel}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

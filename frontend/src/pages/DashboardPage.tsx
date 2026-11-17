import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Download,
  Gauge,
  RefreshCw,
  Zap,
} from 'lucide-react'
import { api, firstError } from '../lib/api'
import { number, rupiah } from '../lib/format'
import type { AdminDashboard, PanelStatus } from '../types'
import { ErrorState, PageLoader, ProgressBar } from '../components/ui'
import { useToast } from '../components/ToastProvider'

export default function DashboardPage() {
  const toast = useToast()
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [filterActionOnly, setFilterActionOnly] = useState(false)

  const load = useCallback(async (silent = false, notify = false) => {
    if (!silent) setRefreshing(true)
    try {
      const response = await api.get<AdminDashboard>('/dashboard')
      setData(response)
      setError('')
      if (notify) toast.success('Data telemetri berhasil disinkronkan dari server.')
    } catch (caught) {
      setError(firstError(caught))
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(true), 30000)
    return () => window.clearInterval(timer)
  }, [load])

  const panelByLabId = useMemo(() => {
    const map = new Map<number, { socket?: PanelStatus; ac?: PanelStatus }>()
    for (const labPanel of data?.panels.labs ?? []) {
      map.set(labPanel.id, {
        socket: labPanel.panels.find((p) => p.group_type === 'SOCKET'),
        ac: labPanel.panels.find((p) => p.group_type === 'AC'),
      })
    }
    return map
  }, [data])

  const metrics = useMemo(() => {
    if (!data) return null
    const totalStandbyWatt = data.labs.reduce((sum, lab) => sum + lab.standby_watt_total, 0)
    const totalActiveWatt = Math.max(data.totals.audited - data.totals.faulty, 0) * data.parameters.active_pc_watt
    const wasteRatio = totalActiveWatt > 0 ? (totalStandbyWatt / totalActiveWatt) * 100 : 0

    let highestPanel: PanelStatus | null = data.panels.warnings[0] ?? null
    for (const labPanel of data.panels.labs ?? []) {
      for (const panel of labPanel.panels) {
        if (panel.percent !== null && (highestPanel?.percent === null || highestPanel === null || panel.percent > highestPanel.percent)) {
          highestPanel = panel
        }
      }
    }

    const totalLabAudits = data.labs.map((lab, index) => {
      const p = panelByLabId.get(lab.id)
      const socketLoad = p?.socket?.load_watt ?? 0
      const acLoad = p?.ac?.load_watt ?? 0
      const totalKw = (socketLoad + acLoad) / 1000
      const critical = p?.socket?.status === 'WARNING' || p?.socket?.status === 'OVER' || p?.ac?.status === 'WARNING' || p?.ac?.status === 'OVER'
      return {
        id: lab.id,
        short: `L-0${index + 1}`,
        name: lab.name,
        totalKw,
        critical,
        standbyWatt: lab.standby_watt_total,
      }
    })
    const maxKw = Math.max(...totalLabAudits.map((item) => item.totalKw), 1)

    const notAudited = Math.max(data.totals.pc_target - data.totals.audited, 0)
    const normalAudited = Math.max(data.totals.audited - data.totals.faulty, 0)
    const totalTarget = Math.max(data.totals.pc_target, 1)

    return {
      totalStandbyWatt,
      totalActiveWatt,
      wasteRatio,
      highestPanel,
      bars: totalLabAudits.map((item) => ({
        ...item,
        heightPercent: Math.max(Math.round((item.totalKw / maxKw) * 95), 12),
      })),
      donut: {
        normalPct: (normalAudited / totalTarget) * 100,
        faultyPct: (data.totals.faulty / totalTarget) * 100,
        unverifiedPct: (notAudited / totalTarget) * 100,
        normalAudited,
        notAudited,
      },
    }
  }, [data, panelByLabId])

  const labCards = useMemo(() => {
    if (!data) return []
    return data.labs.map((lab) => {
      const p = panelByLabId.get(lab.id)
      const socket = p?.socket
      const ac = p?.ac
      const socketPercent = socket?.percent ?? 0
      const acPercent = ac?.percent ?? 0
      const isCritical = socket?.status === 'OVER' || ac?.status === 'OVER' || socketPercent >= 85
      const isWarning = !isCritical && (socket?.status === 'WARNING' || ac?.status === 'WARNING' || lab.faulty_count > 0 || lab.progress_percent < 90)
      const statusTone: 'danger' | 'warning' | 'success' = isCritical ? 'danger' : isWarning ? 'warning' : 'success'
      const statusLabel = isCritical ? 'Kritis' : isWarning ? 'Waspada' : 'Aman'
      const needsAction = isCritical || isWarning

      return {
        id: lab.id,
        code: lab.location || `GK1-30${lab.id} • LT. 3`,
        name: lab.name,
        status: statusLabel,
        statusTone,
        pcAudit: `${lab.audited_count} / ${lab.capacity} PC (${number(lab.progress_percent, 1)}%)`,
        pcProgress: lab.progress_percent,
        mcb10a: socket?.load_watt !== null && socket?.load_watt !== undefined
          ? `${number(socket.load_watt, 0)} W / ${number(socket.limit_watt, 0)} W (${number(socketPercent, 1)}%)`
          : 'Belum ada pembacaan',
        mcb10aProgress: socketPercent,
        mcb40a: ac?.load_watt !== null && ac?.load_watt !== undefined
          ? `${number(ac.load_watt, 0)} W / ${number(ac.limit_watt, 0)} W (${number(acPercent, 1)}%)`
          : 'Belum ada pembacaan',
        mcb40aProgress: acPercent,
        vampire: `${number(lab.standby_watt_total, 0)} Watt (${lab.faulty_count > 0 ? `${lab.faulty_count} PC bermasalah` : 'Normal'})`,
        needsAction,
        btnLabel: isCritical ? '◇ Intervensi MCB & Lapor' : '△ Detail Audit & Panel',
      }
    })
  }, [data, panelByLabId])

  function handleExportCsv() {
    if (!data) return
    const headers = ['Lab', 'Lokasi', 'PC Teraudit', 'Kapasitas', 'Progres (%)', 'Unit Bermasalah', 'Daya Standby (W)', 'MCB 10A (W)', 'MCB 40A (W)', 'Estimasi Biaya/Bln (Rp)']
    const rows = data.labs.map((lab) => {
      const p = panelByLabId.get(lab.id)
      return [
        `"${lab.name}"`,
        `"${lab.location ?? ''}"`,
        lab.audited_count,
        lab.capacity,
        lab.progress_percent,
        lab.faulty_count,
        lab.standby_watt_total,
        p?.socket?.load_watt ?? 0,
        p?.ac?.load_watt ?? 0,
        lab.energy.cost_per_month,
      ].join(',')
    })
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `telemetri-6-lab-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Log telemetri CSV berhasil diunduh.')
  }

  if (loading && !data) return <PageLoader label="Memuat telemetri enam laboratorium..." />
  if (error && !data) return <ErrorState message={error} onRetry={() => void load()} />
  if (!data || !metrics) return null

  const actionCount = labCards.filter((l) => l.needsAction).length
  const displayedLabs = filterActionOnly ? labCards.filter((l) => l.needsAction) : labCards

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            FAKULTAS ILMU KOMPUTER • Gedung Kuliah Terpadu Lt. 3
          </div>
          <h1>Konsol Telemetri Energi &amp; {data.totals.labs} Laboratorium Komputer</h1>
          <p>
            Pemantauan konsumsi daya dinamis, beban parasitik (vampire load), dan integritas distribusi
            MCB fasa tunggal.
          </p>
        </div>

        <div className="head-actions-row">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load(false, true)} disabled={refreshing}>
            <span className="badge-dot" style={{ backgroundColor: '#10b981' }} />
            Pembacaan Terkini
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load(false, true)} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
            Sinkronisasi Sensor
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleExportCsv}>
            <Download size={14} />
            Ekspor Log
          </button>
        </div>
      </div>

      <div className="dashboard-top-grid">
        <section className="chart-card">
          <div className="card-head">
            <div>
              <div className="eyebrow" style={{ color: '#94a3b8' }}>
                ESTIMASI BEBAN TERUKUR &amp; STANDBY
              </div>
              <h2 className="card-title">Analisis Komparasi Daya Aktif vs. Vampir (Standby)</h2>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="badge-dot" style={{ backgroundColor: '#38bdf8' }} /> Referensi Aktif ({number(data.parameters.active_pc_watt, 0)}W/PC)
              </span>
              <span style={{ color: '#f97316', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="badge-dot" style={{ backgroundColor: '#f97316' }} /> Daya Vampir Standby
              </span>
            </div>
          </div>

          <div className="chart-kpi-header">
            <div className="chart-kpi-item">
              <span className="chart-kpi-label">KAPASITAS AKTIF TERAUDIT</span>
              <span className="chart-kpi-val">
                {number(metrics.totalActiveWatt / 1000, 1)} <span style={{ fontSize: '12px', color: '#64748b' }}>kW</span>
              </span>
              <span className="chart-kpi-sub">{data.totals.audited} unit terverifikasi</span>
            </div>
            <div className="chart-kpi-item">
              <span className="chart-kpi-label">STANDBY WASTED DRAW</span>
              <span className="chart-kpi-val" style={{ color: '#f97316' }}>
                {number(metrics.totalStandbyWatt / 1000, 2)} <span style={{ fontSize: '12px', color: '#64748b' }}>kW</span>
              </span>
              <span className="chart-kpi-sub">{number(data.parameters.standby_hours_per_day, 0)} jam/hari × {number(data.parameters.standby_days_per_month, 0)} hari</span>
            </div>
            <div className="chart-kpi-item">
              <span className="chart-kpi-label">RASIO KEBOCORAN VAMPIR</span>
              <span className="chart-kpi-val" style={{ color: '#fbbf24' }}>{number(metrics.wasteRatio, 1)}%</span>
              <span className="chart-kpi-sub">Standar efisiensi: &lt; 2.5%</span>
            </div>
          </div>

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
              <line x1="0" y1="35" x2="700" y2="35" stroke="#26292e" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="700" y2="70" stroke="#26292e" strokeDasharray="3 3" />
              <line x1="0" y1="105" x2="700" y2="105" stroke="#26292e" strokeDasharray="3 3" />
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
            ⓘ {data.data_note}
          </div>
        </section>

        <section className="chart-card">
          <div className="card-head">
            <div>
              <div className="eyebrow" style={{ color: '#94a3b8' }}>
                DISTRIBUSI PEMBEBANAN
              </div>
              <h2 className="card-title">Beban Watt Per Lab</h2>
            </div>
            <span className="badge badge-warning">Live DB</span>
          </div>
          <p className="card-sub" style={{ marginBottom: '16px' }}>
            Perbandingan konsumsi daya panel (MCB 10A Stopkontak + MCB 40A AC) dari database.
          </p>

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
            {metrics.bars.map((bar) => (
              <div
                key={bar.id}
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
                {bar.critical && (
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
                    +{number(bar.standbyWatt, 0)}W IDLE
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
                  {number(bar.totalKw, 1)} kW
                </span>
                <div
                  style={{
                    width: '100%',
                    height: `${bar.heightPercent}%`,
                    backgroundColor: bar.critical ? '#f97316' : '#38bdf8',
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
                  {bar.short}
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
              <span className="badge-dot" style={{ backgroundColor: '#ef4444' }} />
              {metrics.highestPanel
                ? `Beban tertinggi: ${metrics.highestPanel.lab_name} (${number(metrics.highestPanel.percent ?? 0, 1)}%)`
                : 'Semua panel terpantau normal'}
            </span>
            <Link to="/panels" style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 600 }}>
              Periksa &gt;
            </Link>
          </div>
        </section>
      </div>

      <div className="dashboard-kpi-row">
        <div className="card" style={{ padding: '16px 18px' }}>
          <div className="eyebrow" style={{ color: '#94a3b8', fontSize: '9.5px' }}>
            STATUS UNIT TERHUBUNG
          </div>
          <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>Komposisi {data.totals.pc_target} PC</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '10px 0' }}>
            <div style={{ position: 'relative', width: '74px', height: '74px', flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="14" fill="none" stroke="#26292e" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="4"
                  strokeDasharray={`${metrics.donut.normalPct} 100`}
                  strokeDashoffset="0"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="4"
                  strokeDasharray={`${metrics.donut.faultyPct} 100`}
                  strokeDashoffset={`${-metrics.donut.normalPct}`}
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
                <span>{data.totals.pc_target}</span>
                <span style={{ fontSize: '7px', color: '#64748b' }}>UNITS</span>
              </div>
            </div>

            <div style={{ fontSize: '10.5px', lineHeight: 1.6, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#10b981' }}>● Normal</span>
                <span className="mono">{metrics.donut.normalAudited}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#f97316' }}>● Anomali</span>
                <span className="mono">{data.totals.faulty}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>● Belum Audit</span>
                <span className="mono">{metrics.donut.notAudited}</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.4 }}>
            {data.totals.faulty} unit bermasalah &amp; {data.totals.pending_incidents} insiden aktif perlu tindak lanjut.
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div className="eyebrow" style={{ color: '#94a3b8', fontSize: '9.5px' }}>
            STANDBY WASTED POWER
          </div>
          <h3 style={{ fontSize: '13px' }}>Total Daya Standby</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0 2px' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f97316' }}>
              {number(metrics.totalStandbyWatt, 0)} <span style={{ fontSize: '12px', color: '#94a3b8' }}>Watt</span>
            </span>
            <span className="badge badge-warning" style={{ fontSize: '10px', padding: '1px 5px' }}>
              {number(data.totals.kwh_per_month, 1)} kWh/bln
            </span>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
            Target efisiensi: &lt; 500 W ({metrics.totalStandbyWatt > 500 ? `Selisih +${number(metrics.totalStandbyWatt - 500, 0)} W` : 'Tercapai'})
          </p>
          <div style={{ display: 'flex', gap: '3px' }}>
            {Array.from({ length: 10 }, (_, i) => i < Math.min(Math.ceil((metrics.totalStandbyWatt / 1500) * 10), 10)).map((active, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '2px',
                  backgroundColor: active ? '#f97316' : '#26292e',
                }}
              />
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div className="eyebrow" style={{ color: '#94a3b8', fontSize: '9.5px' }}>
            AUDITING COMPLETION
          </div>
          <h3 style={{ fontSize: '13px' }}>Progress Audit PC</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0 2px' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {data.totals.audited} <span style={{ fontSize: '13px', color: '#64748b' }}>/ {data.totals.pc_target} PC</span>
            </span>
            <span className="badge badge-success" style={{ fontSize: '10px', padding: '1px 5px' }}>
              {number(data.totals.progress_percent, 1)}%
            </span>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
            Sisa {metrics.donut.notAudited} PC belum diverifikasi petugas
          </p>
          <ProgressBar value={data.totals.progress_percent} tone="success" height={6} />
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div className="eyebrow" style={{ color: '#94a3b8', fontSize: '9.5px' }}>
            FINANCIAL WASTE VELOCITY
          </div>
          <h3 style={{ fontSize: '13px' }}>Estimasi Pemborosan</h3>
          <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', margin: '6px 0 2px' }}>
            {rupiah(data.totals.cost_per_month)} <span style={{ fontSize: '11px', color: '#64748b' }}>/ bln</span>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Tarif PLN: {rupiah(data.parameters.tariff_per_kwh)} / kWh · Emisi {number(data.totals.emission_kg_per_month, 1)} kg CO₂e
          </p>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div className="eyebrow" style={{ color: '#f87171', fontSize: '9.5px' }}>
            CRITICAL PEAK LOAD
          </div>
          <h3 style={{ fontSize: '13px' }}>Beban MCB Tertinggi</h3>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: '#f87171',
              margin: '6px 0 2px',
            }}
          >
            {metrics.highestPanel
              ? `${metrics.highestPanel.lab_name?.split(' ').slice(0, 2).join(' ')} (${number(metrics.highestPanel.percent ?? 0, 1)}%)`
              : 'Normal'}
          </div>
          <p style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px' }}>
            {metrics.highestPanel
              ? `${metrics.highestPanel.group_label}: ${number(metrics.highestPanel.load_watt ?? 0, 0)} W / ${number(metrics.highestPanel.limit_watt, 0)} W`
              : 'Belum ada pembacaan panel'}
          </p>
        </div>
      </div>

      <section className="card" style={{ marginTop: '20px' }}>
        <div className="card-head">
          <div>
            <div className="eyebrow" style={{ color: '#94a3b8' }}>
              SUB-SISTEM DISTRIBUSI DAYA LABORATORIUM
            </div>
            <h2 className="card-title">Status Telemetri {data.labs.length} Laboratorium Komputer</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`btn btn-xs ${!filterActionOnly ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterActionOnly(false)}
            >
              Filter Ruang: Semua ({labCards.length})
            </button>
            <button
              type="button"
              className={`btn btn-xs ${filterActionOnly ? 'btn-danger' : 'btn-secondary'}`}
              onClick={() => setFilterActionOnly(true)}
            >
              Perlu Tindakan ({actionCount})
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
                <ProgressBar value={lab.pcProgress} tone={lab.statusTone} height={4} />

                <div className="lab-metric-line" style={{ marginTop: '6px' }}>
                  <span className="label">
                    <Zap size={11} /> MCB 10A (Meja PC):
                  </span>
                  <span className="val">{lab.mcb10a}</span>
                </div>
                <ProgressBar value={lab.mcb10aProgress} tone={lab.statusTone} height={4} />

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

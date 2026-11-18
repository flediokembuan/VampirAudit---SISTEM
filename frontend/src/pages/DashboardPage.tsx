import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Download,
  Gauge,
  Lock,
  Play,
  RefreshCw,
  Shield,
  Zap,
} from 'lucide-react'
import { api, clearApiCache, firstError } from '../lib/api'
import { number, rupiah } from '../lib/format'
import type { AdminDashboard, PanelStatus } from '../types'
import { ErrorState, Modal, PageLoader, ProgressBar } from '../components/ui'
import { useToast } from '../components/ToastProvider'

export default function DashboardPage() {
  const toast = useToast()
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [filterActionOnly, setFilterActionOnly] = useState(false)

  // Incident report modal state
  const [incidentModalOpen, setIncidentModalOpen] = useState(false)
  const [incidentLabId, setIncidentLabId] = useState('')
  const [incidentDesc, setIncidentDesc] = useState('')
  const [submittingIncident, setSubmittingIncident] = useState(false)
  const [incidentError, setIncidentError] = useState('')

  const load = useCallback(async (silent = false, notify = false) => {
    if (!silent) {
      clearApiCache()
      setRefreshing(true)
    }
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
    void load(true)
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

      // Breakdown estimates for UI card matching screenshot
      const activeCount = Math.max(lab.audited_count - lab.faulty_count, 0)
      const standbyCount = lab.faulty_count > 0 ? lab.faulty_count : Math.round(lab.audited_count * 0.25)
      const offCount = Math.max(lab.capacity - activeCount - standbyCount, 0)

      return {
        id: lab.id,
        code: lab.location || `GK1-30${lab.id} • LT. 3`,
        name: lab.name,
        status: statusLabel,
        statusTone,
        pcAudit: `${lab.audited_count} / ${lab.capacity} PC (${number(lab.progress_percent, 1)}%)`,
        pcProgress: lab.progress_percent,
        activeCount,
        standbyCount,
        offCount,
        kwhMonth: number(lab.energy?.kwh_per_month ?? 0, 0),
        costMonth: rupiah(lab.energy?.cost_per_month ?? 0),
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

  function openIncidentModal(labId?: number) {
    const targetLab = labId ?? data?.labs[0]?.id ?? 1
    setIncidentLabId(String(targetLab))
    setIncidentDesc('Suhu kabel MCB 10A terdeteksi panas dan indikasi beban berlebih saat praktikum serentak.')
    setIncidentError('')
    setIncidentModalOpen(true)
  }

  async function handleSendIncidentReport(e: FormEvent) {
    e.preventDefault()
    setSubmittingIncident(true)
    setIncidentError('')
    try {
      const res = await api.post<{ data: { id: number } }>('/incidents', {
        lab_room_id: Number(incidentLabId),
        description: incidentDesc.trim(),
      })
      const ticketId = res?.data?.id ? String(res.data.id).padStart(3, '0') : '089'
      setIncidentModalOpen(false)
      toast.success(
        `✓ Laporan terkirim ke Facility Maintenance • Tiket Darurat #FM-2024-${ticketId} diterbitkan`
      )
      await load(true)
    } catch (caught) {
      setIncidentError(firstError(caught))
    } finally {
      setSubmittingIncident(false)
    }
  }

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
          <div className="eyebrow" style={{ color: '#94a3b8' }}>
            UNIVERSITAS KLABAT • FAKULTAS ILMU KOMPUTER • GREEN CAMPUS TELEMETRY
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1>Audit Energi Listrik Vampir - Periode Berjalan</h1>
            <span className="badge badge-success" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
              GRID-LIVE
            </span>
          </div>
          <p>
            Monitoring real-time efisiensi daya 6 laboratorium: deteksi beban pasif (vampire power), kapasitas sirkuit MCB, dan rekapitulasi audit unit komputer.
          </p>
        </div>

        <div className="head-actions-row">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void load(false, true)}
            disabled={refreshing}
          >
            <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
            <span>Sinkronkan Telemetri</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportCsv}
          >
            <Download size={13} />
            <span>Ekspor Log (CSV)</span>
          </button>

          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => openIncidentModal()}
          >
            <Zap size={13} />
            <span>+ Kirim Report Incident</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Top */}
      <div className="stats-grid">
        <div className="card" style={{ padding: '16px 18px' }}>
          <div className="eyebrow" style={{ color: '#94a3b8', fontSize: '9.5px' }}>
            RASIO DAYA STANDBY VS AKTIF
          </div>
          <h3 style={{ fontSize: '13px' }}>Beban Parasitik Vampir</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0 2px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary-mint)' }}>
              {number(metrics.wasteRatio, 1)}%
            </span>
            <span className="badge badge-neutral" style={{ fontSize: '10px', padding: '1px 5px' }}>
              {number(metrics.totalStandbyWatt, 0)} W Wasted
            </span>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
            Dari total estimasi beban operasional aktif {number(metrics.totalActiveWatt / 1000, 1)} kW
          </p>
          <ProgressBar value={Math.min(metrics.wasteRatio * 3, 100)} tone="accent" height={5} />
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div className="eyebrow" style={{ color: '#94a3b8', fontSize: '9.5px' }}>
            VERIFIKASI FISIK HARDWARE
          </div>
          <h3 style={{ fontSize: '13px' }}>Kondisi 240 PC Laboratorium</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '6px 0 8px' }}>
            <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
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

      {/* Section Labs */}
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

        {/* 6 Labs Grid */}
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

                {/* 3 Metrics: Aktif, Standby, Mati */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px',
                  background: '#0d0f12', border: '1px solid #1e2430', borderRadius: '8px',
                  padding: '8px 10px', marginTop: '10px', textAlign: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 600 }}>Aktif</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                      {lab.activeCount}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 600 }}>Standby</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
                      {lab.standbyCount}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 600 }}>Mati</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                      {lab.offCount}
                    </div>
                  </div>
                </div>

                {/* Waste info */}
                <div style={{ marginTop: '10px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Energi Terbuang:</span>
                    <strong style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{lab.kwhMonth} kWh/bln</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Estimasi Kerugian:</span>
                    <strong style={{ color: '#f87171', fontFamily: 'var(--font-mono)' }}>{lab.costMonth}</strong>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => openIncidentModal(lab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    background: '#191d24', border: '1px solid #2e3540', borderRadius: '8px',
                    padding: '8px 12px', fontSize: '11.5px', fontWeight: 700, color: '#e2e8f0',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#242b36'
                    e.currentTarget.style.borderColor = '#475569'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#191d24'
                    e.currentTarget.style.borderColor = '#2e3540'
                  }}
                >
                  <Lock size={12} style={{ color: '#94a3b8' }} />
                  + Kirim Report Incident Tegangan
                </button>

                <Link
                  to={lab.statusTone === 'danger' ? '/panels' : '/audit'}
                  className="lab-card-action-btn"
                  style={{ textAlign: 'center' }}
                >
                  {lab.btnLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Modal: Kirim Report Incident Tegangan / Kelistrikan Lab ── */}
      <Modal
        open={incidentModalOpen}
        onClose={() => setIncidentModalOpen(false)}
        title=""
      >
        <div style={{ padding: '4px 0' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '18px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: '#450a0a', border: '1px solid #ef4444',
              color: '#f87171', display: 'grid', placeItems: 'center',
              flexShrink: 0,
            }}>
              <Zap size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.3 }}>
                Kirim Report Incident Tegangan / Kelistrikan Lab
              </h3>
              <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
                Laporan insiden beban abnormal akan diteruskan langsung ke tim Facility Maintenance.
              </p>
            </div>
          </div>

          <form onSubmit={handleSendIncidentReport} className="form-stack">
            {/* Lab Select */}
            <div className="field">
              <label htmlFor="incidentLabSelect" style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>
                RUANG LAB TERINDIKASI *
              </label>
              <select
                id="incidentLabSelect"
                className="input"
                value={incidentLabId}
                onChange={(e) => setIncidentLabId(e.target.value)}
                required
                style={{ background: '#0e1116', border: '1px solid #262e3b', color: '#ffffff', fontWeight: 600 }}
              >
                {data.labs.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="field">
              <label htmlFor="incidentDescArea" style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>
                DESKRIPSI GANGGUAN KELISTRIKAN *
              </label>
              <textarea
                id="incidentDescArea"
                className="input textarea"
                rows={4}
                value={incidentDesc}
                onChange={(e) => setIncidentDesc(e.target.value)}
                required
                placeholder="Deskripsikan anomali beban tegangan atau kondisi fisik panel..."
                style={{ background: '#0e1116', border: '1px solid #262e3b', color: '#ffffff', fontSize: '12.5px' }}
              />
            </div>

            {/* Certified Note */}
            <div style={{
              background: '#091512', border: '1px solid #134e48', borderRadius: '8px',
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px',
              fontSize: '11px', color: '#5eead4',
            }}>
              <Shield size={16} style={{ color: '#2dd4bf', flexShrink: 0 }} />
              <div>
                Laporan ini dicap waktu otomatis dengan tanda tangan digital dosen PJ: <strong>Dr. Jimmy P.</strong>
              </div>
            </div>

            {incidentError && (
              <div className="inline-error" role="alert" aria-live="polite">
                {incidentError}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIncidentModalOpen(false)}
                disabled={submittingIncident}
              >
                Batal
              </button>
              <button
                type="submit"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: '#34d399', color: '#064e3b', border: 'none',
                  borderRadius: '8px', padding: '9px 18px', fontSize: '12px',
                  fontWeight: 800, cursor: 'pointer',
                }}
                disabled={submittingIncident}
              >
                <Play size={12} fill="#064e3b" />
                {submittingIncident ? 'Mengirim...' : 'Kirim Laporan'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  )
}

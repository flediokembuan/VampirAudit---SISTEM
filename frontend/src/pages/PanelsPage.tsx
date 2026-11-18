import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  CheckCircle2,
  Clock,
  Download,
  Plus,
  Send,
  ShieldAlert,
  VolumeX,
  Zap,
} from 'lucide-react'
import { api, clearApiCache, firstError } from '../lib/api'
import { number, relativeTime } from '../lib/format'
import { ErrorState, Modal, PageLoader, ProgressBar } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import type { Incident, Paginated, PanelOverview, PanelStatus, Parameters } from '../types'

function ticketCode(incident: Incident): string {
  const year = new Date(incident.created_at).getFullYear() || 2024
  return `#INC-${year}-${String(incident.id).padStart(3, '0')}`
}

function labStatusInfo(socket: PanelStatus | undefined, ac: PanelStatus | undefined) {
  const socketOver = socket?.status === 'OVER'
  const acOver = ac?.status === 'OVER'
  const socketWarn = socket?.status === 'WARNING'
  const acWarn = ac?.status === 'WARNING'
  if (socketOver || acOver) {
    const pct = Math.max(socket?.percent ?? 0, ac?.percent ?? 0)
    return { label: `KRITIS MELEBIHI ${number(pct, 0)}%`, tone: 'danger' as const }
  }
  if (socketWarn || acWarn) return { label: 'WASPADA', tone: 'warning' as const }
  return { label: 'NORMAL', tone: 'success' as const }
}

export default function PanelsPage() {
  const toast = useToast()
  const [panelOverview, setPanelOverview] = useState<(PanelOverview & { parameters?: Parameters }) | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'BARU' | 'DITANGANI' | 'SELESAI'>('ALL')
  const [silenced, setSilenced] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [newLab, setNewLab] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Section B inline form state
  const [readingLabId, setReadingLabId] = useState('')
  const [readingGroup, setReadingGroup] = useState<'SOCKET' | 'AC'>('SOCKET')
  const [readingWatt, setReadingWatt] = useState('')
  const [savingReading, setSavingReading] = useState(false)
  const [readingError, setReadingError] = useState('')

  // Modal reading (kept for card button)
  const [readingOpen, setReadingOpen] = useState(false)
  const [readingNotes, setReadingNotes] = useState('')
  const [modalReadingLabId, setModalReadingLabId] = useState('')
  const [modalReadingGroup, setModalReadingGroup] = useState<'SOCKET' | 'AC'>('SOCKET')
  const [modalReadingWatt, setModalReadingWatt] = useState('')
  const [modalSaving, setModalSaving] = useState(false)
  const [modalReadingError, setModalReadingError] = useState('')

  const pollingRef = useRef(false)

  const load = useCallback(async (silent = false, fresh = false) => {
    if (fresh) {
      if (pollingRef.current) return
      pollingRef.current = true
    } else if (!silent) {
      clearApiCache()
    }
    try {
      const [panelsRes, incidentsRes] = await Promise.all([
        api.get<PanelOverview & { parameters?: Parameters }>('/panel-limits', undefined, { fresh }),
        api.get<Paginated<Incident>>('/incidents', { per_page: 100 }, { fresh }),
      ])
      setPanelOverview(panelsRes)
      setIncidents(incidentsRes.data)
      if (panelsRes.labs.length > 0) {
        setNewLab((prev) => prev || String(panelsRes.labs[0].id))
        setReadingLabId((prev) => prev || String(panelsRes.labs[0].id))
        setModalReadingLabId((prev) => prev || String(panelsRes.labs[0].id))
      }
      setError('')
    } catch (caught) {
      if (!silent) setError(firstError(caught))
    } finally {
      if (fresh) pollingRef.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(true) }, [load])

  useEffect(() => {
    const pollSeconds = Math.max(panelOverview?.parameters?.incident_poll_seconds ?? 5, 2)
    const timer = window.setInterval(() => {
      if (document.hidden || pollingRef.current) return
      void load(true, true)
    }, pollSeconds * 1000)
    return () => window.clearInterval(timer)
  }, [load, panelOverview?.parameters?.incident_poll_seconds])

  const stats = useMemo(() => {
    const labs = panelOverview?.labs ?? []
    let totalWatt = 0
    let highestWarning: PanelStatus | null = panelOverview?.warnings[0] ?? null
    for (const lab of labs) {
      for (const p of lab.panels) {
        totalWatt += p.load_watt ?? 0
        if ((p.status === 'WARNING' || p.status === 'OVER') && (!highestWarning || (p.percent ?? 0) > (highestWarning.percent ?? 0))) {
          highestWarning = p
        }
      }
    }
    const baruCount = incidents.filter((i) => i.status === 'BARU').length
    const ditanganiCount = incidents.filter((i) => i.status === 'DITANGANI').length
    const selesaiCount = incidents.filter((i) => i.status === 'SELESAI').length
    return {
      totalKw: totalWatt / 1000,
      totalAmpere: totalWatt / 220,
      highestWarning,
      baruCount,
      ditanganiCount,
      selesaiCount,
      activeCount: baruCount + ditanganiCount,
    }
  }, [panelOverview, incidents])

  async function handleAdvanceStatus(incident: Incident, target: 'DITANGANI' | 'SELESAI') {
    setBusyId(incident.id)
    try {
      if (incident.status === 'BARU' && target === 'SELESAI') {
        await api.patch(`/incidents/${incident.id}/status`, { status: 'DITANGANI', note: 'Ditangani oleh tim Facility Maintenance.' })
      }
      await api.patch(`/incidents/${incident.id}/status`, {
        status: target,
        note: target === 'SELESAI' ? 'Insiden selesai ditangani dan terverifikasi aman.' : 'Sedang dalam pemeriksaan teknisi.',
      })
      await load(true)
      toast.success(`Tiket ${ticketCode(incident)} diperbarui ke ${target}.`)
    } catch (caught) {
      toast.error(firstError(caught))
    } finally {
      setBusyId(null)
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!newDesc.trim() || !newLab) return
    setCreating(true)
    setCreateError('')
    try {
      await api.post('/incidents', { lab_room_id: Number(newLab), description: newDesc.trim() })
      setCreateOpen(false)
      setNewDesc('')
      await load(true)
      toast.success('Tiket insiden baru berhasil diterbitkan ke database!')
    } catch (caught) {
      setCreateError(firstError(caught))
    } finally {
      setCreating(false)
    }
  }

  function openReadingModal(labId: number, group: 'SOCKET' | 'AC', currentWatt: number | null) {
    setModalReadingLabId(String(labId))
    setModalReadingGroup(group)
    setModalReadingWatt(currentWatt !== null ? String(currentWatt) : '')
    setReadingNotes('')
    setModalReadingError('')
    setReadingOpen(true)
  }

  async function handleSubmitModalReading(e: FormEvent) {
    e.preventDefault()
    setModalSaving(true)
    setModalReadingError('')
    try {
      await api.post('/panel-readings', {
        lab_room_id: Number(modalReadingLabId),
        group_type: modalReadingGroup,
        load_watt: Number(modalReadingWatt),
        source: 'MANUAL_MEASUREMENT',
        notes: readingNotes.trim() || null,
      })
      setReadingOpen(false)
      await load(true)
      toast.success('Pembacaan beban MCB berhasil disimpan!')
    } catch (caught) {
      setModalReadingError(firstError(caught))
    } finally {
      setModalSaving(false)
    }
  }

  async function handleSubmitReading(e: FormEvent) {
    e.preventDefault()
    if (!readingWatt) return
    setSavingReading(true)
    setReadingError('')
    try {
      await api.post('/panel-readings', {
        lab_room_id: Number(readingLabId),
        group_type: readingGroup,
        load_watt: Number(readingWatt),
        source: 'MANUAL_MEASUREMENT',
        notes: null,
      })
      setReadingWatt('')
      await load(true)
      toast.success('Pembacaan beban MCB berhasil disimpan!')
    } catch (caught) {
      setReadingError(firstError(caught))
    } finally {
      setSavingReading(false)
    }
  }

  function handleExportCsv() {
    const headers = ['ID Tiket', 'Lab', 'Deskripsi', 'Pelapor', 'Status', 'Waktu']
    const rows = incidents.map((i) => [
      ticketCode(i),
      `"${i.lab_name ?? ''}"`,
      `"${i.description.replace(/"/g, '""')}"`,
      `"${i.reporter?.name ?? ''}"`,
      i.status_label,
      i.created_at,
    ].join(','))
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `rekap-insiden-vampir-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Rekap tiket insiden CSV berhasil diunduh.')
  }

  if (loading && !panelOverview) return <PageLoader label="Memuat panel MCB & tiket insiden..." />
  if (error && !panelOverview) return <ErrorState message={error} onRetry={() => void load()} />

  const filteredTickets = incidents.filter((item) => filter === 'ALL' || item.status === filter)
  const newestIncident = incidents.find((i) => i.status === 'BARU')

  // Determine selected lab's limits for Section B dropdown hint
  const selectedLab = panelOverview?.labs.find((l) => String(l.id) === readingLabId)
  const selectedPanel = selectedLab?.panels.find((p) => p.group_type === readingGroup)

  return (
    <>
      {/* ── Page-level context header ─────────────────────────────────── */}
      <div className="panels-context-header">
        <div className="panels-context-left">
          <div className="panels-user-info">
            <span className="panels-username">Budi Santoso</span>
            <span className="badge badge-warning" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>FACILITY MAINTENANCE</span>
            <span className="panels-shift">FIK Shift Pagi</span>
          </div>
          <div className="panels-session-info">
            <span className="dot-green">●</span> Sesi Lapangan Aktif
            <span className="sep">•</span> Lokasi Gedung FIK Lantai 2
            <span className="sep">•</span> Panel Distribusi Utama
          </div>
        </div>
        <div className="panels-context-right">
          {stats.baruCount > 0 && (
            <button type="button" className="btn btn-danger btn-sm" style={{ gap: '6px' }}>
              <span>●</span> {stats.baruCount} Insiden Baru
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm">Keluar</button>
        </div>
      </div>

      {/* ── Incident banner ───────────────────────────────────────────── */}
      {!silenced && newestIncident && (
        <div className="incident-banner">
          <div className="incident-banner-left">
            <ShieldAlert size={18} />
            <div>
              <span className="incident-banner-label">⚠ Laporan Insiden Baru: {newestIncident.description}</span>
              <span className="incident-banner-time">DITERIMA {relativeTime(newestIncident.created_at).toUpperCase()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-xs"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
              onClick={() => {
                const el = document.getElementById('section-c')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Tinjau {newestIncident.lab_name ?? `Lab ${newestIncident.lab_room_id}`} ↓
            </button>
            <button type="button" className="btn btn-xs" style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none' }} onClick={() => setSilenced(true)}>
              <VolumeX size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          BAGIAN A — Monitoring Panel MCB 10A / 40A
      ═══════════════════════════════════════════════════════════════ */}
      <section className="card" style={{ marginBottom: '22px' }}>
        <div className="card-head">
          <div>
            <div className="eyebrow" style={{ color: '#94a3b8' }}>PANEL MONITORING MCB &amp; SUB-DISTRIBUSI KAMPUS</div>
            <h2 className="card-title">Bagian A: Monitoring Panel MCB 10A / 40A</h2>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '14px', fontSize: '11px', fontFamily: 'var(--font-mono)', flexWrap: 'wrap' }}>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="badge-dot" style={{ backgroundColor: '#10b981' }} /> Hijau Normal (&lt;75%)
            </span>
            <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="badge-dot" style={{ backgroundColor: '#f59e0b' }} /> Oranye Waspada (75–90%)
            </span>
            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="badge-dot" style={{ backgroundColor: '#ef4444' }} /> Merah Kritis (&gt;90%)
            </span>
          </div>
        </div>

        <div className="mcb-panel-grid">
          {(panelOverview?.labs ?? []).map((lab) => {
            const socket = lab.panels.find((p) => p.group_type === 'SOCKET')
            const ac = lab.panels.find((p) => p.group_type === 'AC')
            const { label: statusLabel, tone: statusTone } = labStatusInfo(socket, ac)
            const isCritical = statusTone === 'danger'
            const isWarning = statusTone === 'warning'
            const socketPct = socket?.percent ?? 0
            const acPct = ac?.percent ?? 0

            // Find first open incident for this lab
            const labIncident = incidents.find(
              (i) => i.lab_room_id === lab.id && (i.status === 'BARU' || i.status === 'DITANGANI')
            )

            return (
              <div
                key={lab.id}
                className={`mcb-card-box${isCritical ? ' mcb-card-critical' : isWarning ? ' mcb-card-warning' : ''}`}
              >
                {/* Card header */}
                <div className="mcb-card-head">
                  <div>
                    <div className="lab-name" style={{ fontWeight: 700, fontSize: '14px' }}>{lab.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {lab.location ?? `Lantai 2 • ${lab.name}`}
                    </div>
                  </div>
                  <span className={`badge badge-${statusTone}`} style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
                    <span className="badge-dot" /> {statusLabel}
                  </span>
                </div>

                {/* Critical overlay badge */}
                {isCritical && (
                  <div className="mcb-critical-alert">
                    ⚡ BAHAYA OVERHEAT TRIP
                  </div>
                )}

                {/* MCB Stopkontak 10A */}
                {socket && (
                  <div className="mcb-breaker-row">
                    <div className="mcb-breaker-label-row">
                      <span className="mcb-breaker-label">MCB Stopkontak 10A</span>
                      <span className="mcb-breaker-watt">{number(socket.load_watt ?? 0, 0)} W</span>
                      <span className={`mcb-breaker-pct ${socketPct > 90 ? 'pct-danger' : socketPct > 75 ? 'pct-warn' : 'pct-ok'}`}>
                        {number(socketPct, 1)}%
                      </span>
                    </div>
                    <ProgressBar
                      value={socketPct}
                      tone={socketPct > 90 ? 'danger' : socketPct > 75 ? 'warning' : 'success'}
                      height={6}
                    />
                  </div>
                )}

                {/* MCB Grup AC 40A */}
                {ac && (
                  <div className="mcb-breaker-row">
                    <div className="mcb-breaker-label-row">
                      <span className="mcb-breaker-label">MCB Grup AC 40A</span>
                      <span className="mcb-breaker-watt">{number(ac.load_watt ?? 0, 0)} W</span>
                      <span className={`mcb-breaker-pct ${acPct > 90 ? 'pct-danger' : acPct > 75 ? 'pct-warn' : 'pct-ok'}`}>
                        {number(acPct, 1)}%
                      </span>
                    </div>
                    <ProgressBar
                      value={acPct}
                      tone={acPct > 90 ? 'danger' : acPct > 75 ? 'warning' : 'accent'}
                      height={6}
                    />
                  </div>
                )}

                {/* Card footer */}
                <div className="mcb-card-footer">
                  <div className="mcb-footer-left">
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                      Panel Box {lab.location ?? 'GK2-Lt2'}
                    </span>
                    {labIncident ? (
                      <span style={{ color: '#f87171', fontSize: '10.5px', fontWeight: 600, marginTop: '2px' }}>
                        {ticketCode(labIncident)} [UTAMA]
                      </span>
                    ) : (
                      <span style={{ color: '#10b981', fontSize: '10.5px' }}>
                        Status Sirkuit: {statusLabel === 'NORMAL' ? 'Aman' : statusLabel}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`btn btn-xs ${isCritical ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => openReadingModal(lab.id, 'SOCKET', socket?.load_watt ?? null)}
                  >
                    Catat
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          BAGIAN B — Input Pembacaan Beban
      ═══════════════════════════════════════════════════════════════ */}
      <section className="card" style={{ marginBottom: '22px' }}>
        <div className="card-head">
          <div>
            <div className="eyebrow" style={{ color: '#94a3b8' }}>FIELD INPUT FORM — FACILITY MAINTENANCE</div>
            <h2 className="card-title">Bagian B: Input Pembacaan Beban</h2>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
              Masukkan pembacaan beban MCB secara manual dari clamp meter / tang ampere di lapangan.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Form */}
          <form onSubmit={handleSubmitReading} className="form-stack" style={{ gap: '14px' }}>
            <div className="field">
              <label htmlFor="secBLab" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                Pilih Ruang Lab
              </label>
              <select
                id="secBLab"
                className="input"
                value={readingLabId}
                onChange={(e) => setReadingLabId(e.target.value)}
                required
              >
                {(panelOverview?.labs ?? []).map((lab) => (
                  <option key={lab.id} value={lab.id}>{lab.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="secBGroup" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                Pilih Grup MCB
                {selectedPanel && (
                  <span style={{ color: '#f59e0b', marginLeft: '8px', fontWeight: 600 }}>
                    (Batas: {number(selectedPanel.limit_watt, 0)} W)
                  </span>
                )}
              </label>
              <select
                id="secBGroup"
                className="input"
                value={readingGroup}
                onChange={(e) => setReadingGroup(e.target.value as 'SOCKET' | 'AC')}
              >
                <option value="SOCKET">Grup Stopkontak — MCB 10A</option>
                <option value="AC">Grup AC Ruangan — MCB 40A</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="secBWatt" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                Nilai Beban Terbaca (Watt)
              </label>
              <input
                id="secBWatt"
                className="input"
                type="number"
                min="0"
                max="100000"
                step="1"
                placeholder="Contoh: 1850"
                value={readingWatt}
                onChange={(e) => setReadingWatt(e.target.value)}
                required
              />
            </div>

            {readingError && <div className="inline-error" role="alert" aria-live="polite">{readingError}</div>}

            <button type="submit" className="btn btn-primary" disabled={savingReading} style={{ marginTop: '4px' }}>
              {savingReading ? 'Menyimpan...' : '💾 SIMPAN PEMBACAAN'}
            </button>
          </form>

          {/* SOP Guide */}
          <div className="sop-guide-box">
            <div className="sop-guide-title">📋 Panduan SOP Lapangan FM</div>
            <ul className="sop-guide-list">
              <li>Pastikan tang ampere sudah dikalibrasi dan menunjukkan angka stabil sebelum mencatat.</li>
              <li>Catat beban pada saat jam puncak (08:00–12:00 &amp; 13:00–17:00). Jika beban &gt;85%, segera laporkan ke supervisor.</li>
              <li>Jika MCB sudah trip, jangan di-reset tanpa izin supervisor. Buat tiket insiden terlebih dahulu.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          BAGIAN C — Live Incident Feed
      ═══════════════════════════════════════════════════════════════ */}
      <section className="card" id="section-c">
        <div className="card-head">
          <div>
            <div className="eyebrow" style={{ color: '#94a3b8' }}>REAL-TIME INCIDENT QUEUE — FACILITY MAINTENANCE</div>
            <h2 className="card-title">
              Bagian C: Live Incident Feed
              <span style={{ marginLeft: '10px', fontSize: '13px', fontWeight: 500, color: '#f87171' }}>
                {stats.activeCount} Laporan Terbuka
              </span>
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Filter tabs */}
            <div className="tab-row">
              <button type="button" className={`tab ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>
                Semua ({incidents.length})
              </button>
              <button type="button" className={`tab ${filter === 'BARU' ? 'active' : ''}`} onClick={() => setFilter('BARU')}>
                Baru ({stats.baruCount})
              </button>
              <button type="button" className={`tab ${filter === 'DITANGANI' ? 'active' : ''}`} onClick={() => setFilter('DITANGANI')}>
                Ditangani ({stats.ditanganiCount})
              </button>
              <button type="button" className={`tab ${filter === 'SELESAI' ? 'active' : ''}`} onClick={() => setFilter('SELESAI')}>
                Selesai ({stats.selesaiCount})
              </button>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportCsv}>
              <Download size={13} /> CSV
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => { setCreateError(''); setCreateOpen(true) }}
            >
              <Plus size={13} /> Tiket Baru
            </button>
          </div>
        </div>

        {/* Incident feed list */}
        <div className="incident-feed-list">
          {filteredTickets.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontSize: '13px' }}>
              <CheckCircle2 size={28} style={{ color: '#10b981', marginBottom: '8px' }} />
              <div>Tidak ada laporan insiden dalam filter ini.</div>
            </div>
          )}

          {filteredTickets.map((t) => {
            const statusTone = t.status === 'SELESAI' ? 'success' : t.status === 'DITANGANI' ? 'info' : 'danger'
            const statusText = t.status === 'BARU' ? 'BARU' : t.status === 'DITANGANI' ? 'DITANGANI' : 'SELESAI'
            const labPanel = panelOverview?.labs.find((l) => l.id === t.lab_room_id)
            const labSocket = labPanel?.panels.find((p) => p.group_type === 'SOCKET')

            return (
              <div key={t.id} className={`incident-feed-item${t.status === 'BARU' ? ' incident-feed-new' : ''}`}>
                {/* Left: ticket meta */}
                <div className="incident-feed-meta">
                  <div className="incident-ticket-code">{ticketCode(t)}</div>
                  <span className={`badge badge-${statusTone}`} style={{ fontSize: '10px' }}>
                    <span className="badge-dot" /> {statusText}
                  </span>
                </div>

                {/* Center: description */}
                <div className="incident-feed-body">
                  <div className="incident-feed-labname">{t.lab_name ?? `Lab ${t.lab_room_id}`}</div>
                  <div className="incident-feed-desc">{t.description}</div>
                  <div className="incident-feed-footer">
                    <Clock size={11} />
                    <span>{relativeTime(t.created_at)}</span>
                    <span>·</span>
                    <span>Pelapor: {t.reporter?.name ?? 'Petugas'}</span>
                    {labSocket && (
                      <>
                        <span>·</span>
                        <span style={{ color: labSocket.percent && labSocket.percent > 90 ? '#f87171' : '#94a3b8' }}>
                          MCB Socket: {number(labSocket.percent ?? 0, 1)}% ({number(labSocket.load_watt ?? 0, 0)} W)
                        </span>
                      </>
                    )}
                    {t.status_note && (
                      <>
                        <span>·</span>
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Catatan: {t.status_note}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: actions */}
                <div className="incident-feed-actions">
                  {t.status === 'BARU' ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-xs btn-secondary"
                        disabled={busyId === t.id}
                        onClick={() => void handleAdvanceStatus(t, 'DITANGANI')}
                      >
                        Tangani
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-primary"
                        disabled={busyId === t.id}
                        onClick={() => void handleAdvanceStatus(t, 'SELESAI')}
                      >
                        <CheckCircle2 size={12} /> Selesai
                      </button>
                    </>
                  ) : t.status === 'DITANGANI' ? (
                    <button
                      type="button"
                      className="btn btn-xs btn-primary"
                      disabled={busyId === t.id}
                      onClick={() => void handleAdvanceStatus(t, 'SELESAI')}
                    >
                      <CheckCircle2 size={12} /> Tandai Selesai
                    </button>
                  ) : (
                    <span className="badge badge-success" style={{ fontSize: '10px' }}>✓ Terverifikasi</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px', color: '#64748b' }}>
          <span>Menampilkan {filteredTickets.length} dari {incidents.length} laporan insiden</span>
          <Zap size={12} style={{ color: '#10b981' }} />
        </div>
      </section>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Buat Tiket Insiden Listrik Baru">
        <form onSubmit={handleCreate} className="form-stack">
          <div className="field">
            <label htmlFor="incidentLab">Laboratorium</label>
            <select
              id="incidentLab"
              name="lab_room_id"
              className="input"
              value={newLab}
              onChange={(e) => setNewLab(e.target.value)}
              required
            >
              {(panelOverview?.labs ?? []).map((lab) => (
                <option key={lab.id} value={lab.id}>{lab.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="incidentDesc">Deskripsi Gangguan / Anomali Listrik</label>
            <textarea
              id="incidentDesc"
              name="description"
              className="input textarea"
              rows={3}
              placeholder="Contoh: Stopkontak nomor 12 berbau hangus, tegangan drop drastis..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              required
            />
          </div>
          {createError && <div className="inline-error" role="alert" aria-live="polite">{createError}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              <Send size={14} /> {creating ? 'Mengirim...' : 'Terbitkan Tiket'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={readingOpen} onClose={() => setReadingOpen(false)} title="Catat Pembacaan Beban MCB">
        <form onSubmit={handleSubmitModalReading} className="form-stack">
          <div className="field">
            <label htmlFor="readingLab">Laboratorium</label>
            <select
              id="readingLab"
              className="input"
              value={modalReadingLabId}
              onChange={(e) => setModalReadingLabId(e.target.value)}
              required
            >
              {(panelOverview?.labs ?? []).map((lab) => (
                <option key={lab.id} value={lab.id}>{lab.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="readingGroup">Grup MCB</label>
            <select
              id="readingGroup"
              className="input"
              value={modalReadingGroup}
              onChange={(e) => setModalReadingGroup(e.target.value as 'SOCKET' | 'AC')}
            >
              <option value="SOCKET">Grup Stopkontak (MCB 10A)</option>
              <option value="AC">Grup AC Ruangan (MCB 40A)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="readingWatt">Beban Terukur (Watt)</label>
            <input
              id="readingWatt"
              className="input"
              type="number"
              min="0"
              max="100000"
              step="1"
              value={modalReadingWatt}
              onChange={(e) => setModalReadingWatt(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="readingNotes">Catatan (opsional)</label>
            <textarea
              id="readingNotes"
              className="input textarea"
              rows={2}
              value={readingNotes}
              onChange={(e) => setReadingNotes(e.target.value)}
            />
          </div>
          {modalReadingError && <div className="inline-error" role="alert" aria-live="polite">{modalReadingError}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setReadingOpen(false)}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={modalSaving}>
              {modalSaving ? 'Menyimpan...' : 'Simpan Pembacaan'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Gauge,
  Plus,
  Send,
  ShieldAlert,
  VolumeX,
  Zap,
} from 'lucide-react'
import { api, firstError } from '../lib/api'
import { number, relativeTime } from '../lib/format'
import { ErrorState, Modal, PageLoader, ProgressBar } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import type { Incident, Paginated, PanelOverview, PanelStatus, Parameters } from '../types'

function ticketCode(incident: Incident): string {
  const year = new Date(incident.created_at).getFullYear() || 2026
  return `#TKT-${year}-${String(incident.id).padStart(3, '0')}`
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

  const [readingOpen, setReadingOpen] = useState(false)
  const [readingLabId, setReadingLabId] = useState('')
  const [readingGroup, setReadingGroup] = useState<'SOCKET' | 'AC'>('SOCKET')
  const [readingWatt, setReadingWatt] = useState('')
  const [readingNotes, setReadingNotes] = useState('')
  const [savingReading, setSavingReading] = useState(false)
  const [readingError, setReadingError] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading((prev) => prev)
    try {
      const [panelsRes, incidentsRes] = await Promise.all([
        api.get<PanelOverview & { parameters?: Parameters }>('/panel-limits'),
        api.get<Paginated<Incident>>('/incidents', { per_page: 100 }),
      ])
      setPanelOverview(panelsRes)
      setIncidents(incidentsRes.data)
      if (panelsRes.labs.length > 0) {
        setNewLab((prev) => prev || String(panelsRes.labs[0].id))
        setReadingLabId((prev) => prev || String(panelsRes.labs[0].id))
      }
      setError('')
    } catch (caught) {
      if (!silent) setError(firstError(caught))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const pollSeconds = Math.max(panelOverview?.parameters?.incident_poll_seconds ?? 5, 2)
    const timer = window.setInterval(() => void load(true), pollSeconds * 1000)
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
        await api.patch(`/incidents/${incident.id}/status`, {
          status: 'DITANGANI',
          note: 'Ditangani oleh tim Facility Maintenance.',
        })
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
      await api.post('/incidents', {
        lab_room_id: Number(newLab),
        description: newDesc.trim(),
      })
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
    setReadingLabId(String(labId))
    setReadingGroup(group)
    setReadingWatt(currentWatt !== null ? String(currentWatt) : '')
    setReadingNotes('')
    setReadingError('')
    setReadingOpen(true)
  }

  async function handleSubmitReading(e: FormEvent) {
    e.preventDefault()
    setSavingReading(true)
    setReadingError('')
    try {
      await api.post('/panel-readings', {
        lab_room_id: Number(readingLabId),
        group_type: readingGroup,
        load_watt: Number(readingWatt),
        source: 'MANUAL_MEASUREMENT',
        notes: readingNotes.trim() || null,
      })
      setReadingOpen(false)
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

  const filteredTickets = incidents.filter((item) => {
    if (filter === 'ALL') return true
    return item.status === filter
  })

  return (
    <>
      {!silenced && stats.highestWarning && (
        <div className="emergency-banner">
          <div className="emergency-info">
            <div className="emergency-icon">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="emergency-title">EMERGENCY ALERT</div>
              <div className="emergency-text">PERINGATAN BEBAN PANEL TINGGI ({stats.highestWarning.status_label.toUpperCase()})</div>
              <div className="emergency-sub">
                {stats.highestWarning.lab_name} — {stats.highestWarning.group_label} mencapai{' '}
                {number(stats.highestWarning.percent ?? 0, 1)}% kapasitas ({number(stats.highestWarning.load_watt ?? 0, 0)} W /{' '}
                {number(stats.highestWarning.limit_watt, 0)} W). {stats.highestWarning.notes ?? 'Segera periksa distribusi beban meja.'}
              </div>
            </div>
          </div>
          <div className="emergency-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSilenced(true)}>
              <VolumeX size={14} /> Bungkam Banner
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              style={{ backgroundColor: '#ffffff', color: '#b91c1c', fontWeight: 700 }}
              onClick={() => openReadingModal(stats.highestWarning!.lab_room_id, stats.highestWarning!.group_type, stats.highestWarning!.load_watt)}
            >
              <Zap size={14} /> Perbarui Pembacaan MCB
            </button>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <Zap size={20} />
          </div>
          <div className="stat-copy">
            <div className="stat-label">GRID STANDARD VOLTAGE</div>
            <div className="stat-value">220.0 <span style={{ fontSize: '13px', color: '#64748b' }}>V RMS</span></div>
            <div className="stat-meta" style={{ color: '#10b981' }}>● Referensi Fasa Tunggal</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <Gauge size={20} />
          </div>
          <div className="stat-copy">
            <div className="stat-label">TOTAL LOAD {panelOverview?.summary.labs ?? 6} LABORATORIUM</div>
            <div className="stat-value">{number(stats.totalKw, 1)} <span style={{ fontSize: '13px', color: '#64748b' }}>kW</span></div>
            <div className="stat-meta">Estimasi Ampere: {number(stats.totalAmpere, 1)} A</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-red">
            <AlertTriangle size={20} />
          </div>
          <div className="stat-copy">
            <div className="stat-label">MCB OVERLOAD WARNING</div>
            <div className="stat-value" style={{ color: '#f87171' }}>
              {panelOverview?.summary.warnings ?? 0}{' '}
              <span style={{ fontSize: '13px', color: '#64748b' }}>/ {panelOverview?.summary.panel_groups ?? 12} Breakers</span>
            </div>
            <div className="stat-meta">
              {stats.highestWarning ? `! ${stats.highestWarning.lab_name}` : 'Semua grup dalam batas aman'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-amber">
            <Clock size={20} />
          </div>
          <div className="stat-copy">
            <div className="stat-label">TIKET INSIDEN AKTIF</div>
            <div className="stat-value">{stats.activeCount} <span style={{ fontSize: '13px', color: '#64748b' }}>Tiket</span></div>
            <div className="stat-meta" style={{ color: '#f59e0b' }}>{stats.baruCount} Baru · {stats.ditanganiCount} Ditangani</div>
          </div>
        </div>
      </div>

      <section className="card" style={{ marginBottom: '22px' }}>
        <div className="card-head">
          <div>
            <div className="eyebrow" style={{ color: '#94a3b8' }}>
              PANEL MONITORING MCB &amp; SUB-DISTRIBUSI KAMPUS
            </div>
            <h2 className="card-title">Monitoring 2 Jalur Utama per Lab: MCB 10A (Stopkontak/PC) &amp; MCB 40A (AC Split)</h2>
          </div>
          <div style={{ display: 'flex', gap: '14px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="badge-dot" style={{ backgroundColor: '#10b981' }} /> Normal (&lt;80%)
            </span>
            <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="badge-dot" style={{ backgroundColor: '#f59e0b' }} /> Waspada (80-100%)
            </span>
            <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="badge-dot" style={{ backgroundColor: '#ef4444' }} /> Over (&gt;100%)
            </span>
          </div>
        </div>

        <div className="labs-grid">
          {(panelOverview?.labs ?? []).map((lab) => {
            const socket = lab.panels.find((p) => p.group_type === 'SOCKET')
            const ac = lab.panels.find((p) => p.group_type === 'AC')
            const critical = socket?.status === 'WARNING' || socket?.status === 'OVER' || ac?.status === 'WARNING' || ac?.status === 'OVER'
            const statusTone = socket?.status === 'OVER' || ac?.status === 'OVER' ? 'danger' : critical ? 'warning' : 'success'
            const socketAmp = socket?.load_watt ? socket.load_watt / socket.voltage : 0
            const acAmp = ac?.load_watt ? ac.load_watt / ac.voltage : 0

            return (
              <div
                key={lab.id}
                className={`lab-card ${critical ? 'critical' : ''}`}
                style={{ backgroundColor: '#14161a' }}
              >
                <div className="lab-card-head">
                  <div>
                    <div className="lab-code">{lab.location ?? `GK1-30${lab.id}`}</div>
                    <div className="lab-name" style={{ fontSize: '13.5px' }}>{lab.name}</div>
                  </div>
                  <span className={`badge badge-${statusTone}`}>
                    <span className="badge-dot" /> {socket?.status === 'OVER' ? 'OVERLOAD' : critical ? 'Waspada' : 'Aman'}
                  </span>
                </div>

                {socket && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                      <span style={{ color: critical ? '#f87171' : '#94a3b8', fontWeight: critical ? 700 : 500 }}>
                        {socket.group_label} ({number(socket.limit_watt, 0)}W)
                      </span>
                      <span className="mono" style={{ color: critical ? '#f87171' : '#ffffff', fontWeight: 600 }}>
                        {number(socket.percent ?? 0, 1)}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: critical ? '#f87171' : '#ffffff' }}>
                        {number(socket.load_watt ?? 0, 0)} W
                      </span>
                      <span className="mono" style={{ fontSize: '10.5px', color: '#64748b' }}>
                        {number(socketAmp, 2)}A / {number(socket.limit_ampere, 1)}A
                      </span>
                    </div>
                    <ProgressBar value={socket.percent ?? 0} tone={statusTone} height={5} />
                  </div>
                )}

                {ac && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                      <span style={{ color: '#94a3b8' }}>{ac.group_label} ({number(ac.limit_watt, 0)}W)</span>
                      <span className="mono" style={{ color: '#ffffff', fontWeight: 600 }}>{number(ac.percent ?? 0, 1)}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {number(ac.load_watt ?? 0, 0)} W
                      </span>
                      <span className="mono" style={{ fontSize: '10.5px', color: '#64748b' }}>
                        {number(acAmp, 2)}A / {number(ac.limit_ampere, 1)}A
                      </span>
                    </div>
                    <ProgressBar value={ac.percent ?? 0} tone="accent" height={5} />
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #1e2126',
                    paddingTop: '8px',
                    fontSize: '11px',
                  }}
                >
                  <span style={{ color: '#94a3b8' }}>
                    {socket?.recorded_at ? `Update ${relativeTime(socket.recorded_at)}` : 'Belum ada catatan'}
                  </span>
                  <button
                    type="button"
                    className={`btn btn-xs ${critical ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => openReadingModal(lab.id, 'SOCKET', socket?.load_watt ?? null)}
                  >
                    Catat Beban
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <div className="eyebrow" style={{ color: '#94a3b8' }}>
              DAFTAR TIKET GANGGUAN LISTRIK &amp; ANOMALI PC
            </div>
            <h2 className="card-title">Antrean perbaikan aktif tim Facility Maintenance UNKLAB.</h2>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
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
          </div>
        </div>

        <div className="table-wrap" tabIndex={0} role="region" aria-label="Daftar tiket insiden kelistrikan">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID TIKET</th>
                <th>LOKASI LAB</th>
                <th>JENIS GANGGUAN / ANOMALI</th>
                <th>PELAPOR</th>
                <th>WAKTU</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'right' }}>TINDAKAN FACILITY</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((t) => {
                const statusTone = t.status === 'SELESAI' ? 'success' : t.status === 'DITANGANI' ? 'info' : 'danger'
                return (
                  <tr key={t.id}>
                    <td className="cell-strong">{ticketCode(t)}</td>
                    <td><strong>{t.lab_name ?? `Lab ${t.lab_room_id}`}</strong></td>
                    <td>
                      <div style={{ maxWidth: '340px' }}>
                        <strong style={{ color: '#ffffff' }}>{t.description}</strong>
                        {t.status_note && (
                          <div className="cell-muted" style={{ fontSize: '11px' }}>Catatan: {t.status_note}</div>
                        )}
                      </div>
                    </td>
                    <td>{t.reporter?.name ?? 'Petugas'}</td>
                    <td className="cell-muted">{relativeTime(t.created_at)}</td>
                    <td>
                      <span className={`badge badge-${statusTone}`}>
                        <span className="badge-dot" /> {t.status_label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {t.status === 'BARU' ? (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
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
                            <CheckCircle2 size={12} />
                            Selesai
                          </button>
                        </div>
                      ) : t.status === 'DITANGANI' ? (
                        <button
                          type="button"
                          className="btn btn-xs btn-primary"
                          disabled={busyId === t.id}
                          onClick={() => void handleAdvanceStatus(t, 'SELESAI')}
                        >
                          <CheckCircle2 size={12} />
                          Tandai Selesai
                        </button>
                      ) : (
                        <span className="badge badge-success">✓ Terverifikasi</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
          <span className="cell-muted" style={{ fontSize: '11px' }}>
            Menampilkan {filteredTickets.length} dari {incidents.length} laporan insiden kelistrikan
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportCsv}>
              <Download size={14} /> Unduh Rekap Tiket (CSV)
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setCreateError('')
                setCreateOpen(true)
              }}
            >
              <Plus size={14} /> Buat Tiket Baru
            </button>
          </div>
        </div>
      </section>

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
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              <Send size={14} /> {creating ? 'Mengirim...' : 'Terbitkan Tiket'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={readingOpen} onClose={() => setReadingOpen(false)} title="Catat Pembacaan Beban MCB">
        <form onSubmit={handleSubmitReading} className="form-stack">
          <div className="field">
            <label htmlFor="readingLab">Laboratorium</label>
            <select
              id="readingLab"
              name="lab_room_id"
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
            <label htmlFor="readingGroup">Grup MCB</label>
            <select
              id="readingGroup"
              name="group_type"
              className="input"
              value={readingGroup}
              onChange={(e) => setReadingGroup(e.target.value as 'SOCKET' | 'AC')}
            >
              <option value="SOCKET">Grup Stopkontak (MCB 10A)</option>
              <option value="AC">Grup AC Ruangan (MCB 40A)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="readingWatt">Beban Terukur (Watt)</label>
            <input
              id="readingWatt"
              name="load_watt"
              className="input"
              type="number"
              min="0"
              max="100000"
              step="1"
              value={readingWatt}
              onChange={(e) => setReadingWatt(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="readingNotes">Catatan (opsional)</label>
            <textarea
              id="readingNotes"
              name="notes"
              className="input textarea"
              rows={2}
              value={readingNotes}
              onChange={(e) => setReadingNotes(e.target.value)}
            />
          </div>
          {readingError && <div className="inline-error" role="alert" aria-live="polite">{readingError}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setReadingOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingReading}>
              {savingReading ? 'Menyimpan...' : 'Simpan Pembacaan'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

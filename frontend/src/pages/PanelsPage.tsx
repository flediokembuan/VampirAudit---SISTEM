import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BellOff,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  Gauge,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  VolumeX,
  Wrench,
  Zap,
} from 'lucide-react'
import { api, firstError } from '../lib/api'
import { Badge, Modal, ProgressBar } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import type { Incident, PanelOverview } from '../types'

export default function PanelsPage() {
  const toast = useToast()
  const [filter, setFilter] = useState<'ALL' | 'URGENT' | 'WORKING' | 'RESOLVED'>('ALL')
  const [silenced, setSilenced] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newLab, setNewLab] = useState('1')
  const [newDesc, setNewDesc] = useState('')

  const [tickets, setTickets] = useState([
    {
      id: '#TKT-2025-089',
      lab: 'Lab 3',
      sub: 'Baris C (PC 29)',
      desc: 'Kabel Power Terkelupas & Stopkontak Goyang',
      detail: 'Terjadi spark kecil saat kabel monitor digoyang, memicu lonjakan watt.',
      reporter: 'Auditor Lapangan — Mario P.',
      time: '15 menit lalu',
      priority: 'URGENT',
      priorityTone: 'danger',
      status: 'SEDANG DIPERIKSA',
      statusTone: 'info',
    },
    {
      id: '#TKT-2025-088',
      lab: 'Lab 4',
      sub: 'Split AC Unit 2',
      desc: 'Kompresor AC Dengung Keras & Arus Melonjak',
      detail: 'Ampere AC2 terukur 11.2A (Standar 7.5A). Filter blower diduga tersumbat total.',
      reporter: 'Dosen — Dr. Edwin T.',
      time: '42 menit lalu',
      priority: 'URGENT',
      priorityTone: 'danger',
      status: 'MENUNGGU TEKNISI',
      statusTone: 'warning',
    },
    {
      id: '#TKT-2025-087',
      lab: 'Lab 1',
      sub: 'Hub Dosen & Switch',
      desc: 'UPS Rak Server Mengeluarkan Bunyi Alarm Berkala',
      detail: 'Baterai internal degrade, standby consumption naik ke 190W saat idle malam.',
      reporter: 'Facility — Randy S.',
      time: '2 jam lalu',
      priority: 'MEDIUM',
      priorityTone: 'warning',
      status: 'SEDANG DIPERIKSA',
      statusTone: 'info',
    },
    {
      id: '#TKT-2025-085',
      lab: 'Lab 2',
      sub: 'Box Panel Sekring',
      desc: 'Baut Terminal Netral MCB Mengalami Korosi Ringan',
      detail: 'Pemeriksaan rutin mendeteksi suhu terminal 43°C dengan thermal gun.',
      reporter: 'Auditor Lapangan — Mario P.',
      time: '4 jam lalu',
      priority: 'MEDIUM',
      priorityTone: 'warning',
      status: 'SEDANG DIPERIKSA',
      statusTone: 'info',
    },
    {
      id: '#TKT-2025-082',
      lab: 'Lab 5',
      sub: 'Meja Asisten 01',
      desc: 'Stopkontak Arde Tidak Menyentuh (Grounding Floating)',
      detail: 'Sudah diganti stopkontak Schneider baru & tes arde aman (0.8 Ohm).',
      reporter: 'Dosen — Sarah K.',
      time: 'Kemarin',
      priority: 'LOW',
      priorityTone: 'neutral',
      status: 'SELESAI',
      statusTone: 'success',
    },
  ])

  function handleComplete(id: string) {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'SELESAI', statusTone: 'success' } : t))
    )
    toast.success(`Tiket ${id} ditandai selesai!`)
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newDesc.trim()) return
    const newT = {
      id: `#TKT-2025-09${tickets.length + 1}`,
      lab: `Lab ${newLab}`,
      sub: 'Area Sentral',
      desc: newDesc,
      detail: 'Dilaporkan melalui Form Insiden Terpadu.',
      reporter: 'Dosen Admin',
      time: 'Baru saja',
      priority: 'URGENT',
      priorityTone: 'danger',
      status: 'MENUNGGU TEKNISI',
      statusTone: 'warning',
    }
    setTickets([newT, ...tickets])
    setCreateOpen(false)
    setNewDesc('')
    toast.success('Tiket insiden baru berhasil diterbitkan!')
  }

  const panels = [
    {
      code: 'GK1-301 • LT. 3',
      name: 'Lab 1 – Pemrograman Dasar',
      status: 'Aman',
      statusTone: 'success',
      voltage: '220.8 V | 50.02 Hz',
      pcWatt: '1.316 W',
      pcPercent: '59.8%',
      pcAmp: '5.98A / 10.0A',
      pcProgress: 59.8,
      acWatt: '3.715 W',
      acPercent: '42.2%',
      acAmp: '16.88A / 40.0A',
      acProgress: 42.2,
      vampire: '142 W',
      critical: false,
    },
    {
      code: 'GK1-302 • LT. 3',
      name: 'Lab 2 – Rekayasa Perangkat Lunak',
      status: 'Aman',
      statusTone: 'success',
      voltage: '221.1 V | 49.98 Hz',
      pcWatt: '1.507 W',
      pcPercent: '68.5%',
      pcAmp: '6.85A / 10.0A',
      pcProgress: 68.5,
      acWatt: '3.960 W',
      acPercent: '45.0%',
      acAmp: '18.0A / 40.0A',
      acProgress: 45.0,
      vampire: '188 W',
      critical: false,
    },
    {
      code: 'GK1-303 • LT. 3',
      name: 'Lab 3 – Jaringan & Komputer Grafis',
      status: 'OVERLOAD ALERT',
      statusTone: 'danger',
      voltage: '214.2 V (-5.8V Delta)',
      pcWatt: '1.936 W',
      pcPercent: '88.0%',
      pcAmp: '8.80A / 10.0A',
      pcProgress: 88.0,
      acWatt: '3.988 W',
      acPercent: '45.3%',
      acAmp: '18.1A / 40.0A',
      acProgress: 45.3,
      vampire: '512 W (Bocor!)',
      critical: true,
      subWarning: 'Sisa toleransi MCB: hanya 1.20A (264 Watt) sebelum bimetal trip.',
    },
    {
      code: 'GK1-304 • LT. 3',
      name: 'Lab 4 – Kecerdasan Buatan (AI)',
      status: 'Waspada',
      statusTone: 'warning',
      voltage: '218.4 V | 50.01 Hz',
      pcWatt: '1.720 W',
      pcPercent: '78.2%',
      pcAmp: '7.82A / 10.0A',
      pcProgress: 78.2,
      acWatt: '4.206 W',
      acPercent: '47.8%',
      acAmp: '19.12A / 40.0A',
      acProgress: 47.8,
      vampire: '294 W',
      critical: false,
    },
    {
      code: 'GK1-305 • LT. 3',
      name: 'Lab 5 – Sistem Informasi & Database',
      status: 'Aman',
      statusTone: 'success',
      voltage: '220.6 V | 50.00 Hz',
      pcWatt: '1.130 W',
      pcPercent: '51.4%',
      pcAmp: '5.14A / 10.0A',
      pcProgress: 51.4,
      acWatt: '3.608 W',
      acPercent: '41.0%',
      acAmp: '16.4A / 40.0A',
      acProgress: 41.0,
      vampire: '115 W',
      critical: false,
    },
    {
      code: 'GK1-306 • LT. 3',
      name: 'Lab 6 – Riset IoT & Keamanan Siber',
      status: 'Aman',
      statusTone: 'success',
      voltage: '220.2 V | 49.99 Hz',
      pcWatt: '970 W',
      pcPercent: '44.1%',
      pcAmp: '4.41A / 10.0A',
      pcProgress: 44.1,
      acWatt: '3.476 W',
      acPercent: '39.5%',
      acAmp: '15.8A / 40.0A',
      acProgress: 39.5,
      vampire: '96 W',
      critical: false,
    },
  ]

  const filteredTickets = tickets.filter((t) => {
    if (filter === 'URGENT') return t.priority === 'URGENT'
    if (filter === 'WORKING') return t.status.includes('DIPERIKSA') || t.status.includes('MENUNGGU')
    if (filter === 'RESOLVED') return t.status === 'SELESAI'
    return true
  })

  return (
    <>
      {/* Red Emergency Alert Banner */}
      {!silenced && (
        <div className="emergency-banner">
          <div className="emergency-info">
            <div className="emergency-icon">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="emergency-title">EMERGENCY ALERT</div>
              <div className="emergency-text">PERINGATAN TEGANGAN ABNORMAL &amp; BEBAN TINGGI KRITIS</div>
              <div className="emergency-sub">
                Lab 3 Sektor Meja PC (GK1-303) mencapai 88.0% kapasitas MCB 10A (1.936 Watt / 2.200 Watt) pada tegangan
                214.2V (Penurunan -5.8V dari grid standar 220V). Segera periksa distribusi beban stopkontak baris tengah.
              </div>
            </div>
          </div>
          <div className="emergency-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setSilenced(true)}>
              <VolumeX size={14} /> Bungkam Sirine (15m)
            </button>
            <button
              className="btn btn-danger btn-sm"
              style={{ backgroundColor: '#ffffff', color: '#b91c1c', fontWeight: 700 }}
              onClick={() => toast.success('Tim lapangan telah diberitahu untuk isolasi beban!')}
            >
              <Zap size={14} /> Kirim Tim Lapangan &amp; Isolasi Beban
            </button>
          </div>
        </div>
      )}

      {/* 4 Standard Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <Zap size={20} />
          </div>
          <div className="stat-copy">
            <div className="stat-label">GRID STANDARD VOLTAGE</div>
            <div className="stat-value">220.4 <span style={{ fontSize: '13px', color: '#64748b' }}>V RMS</span></div>
            <div className="stat-meta" style={{ color: '#10b981' }}>● Fasa Tunggal Stabil</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <Gauge size={20} />
          </div>
          <div className="stat-copy">
            <div className="stat-label">TOTAL LOAD 6 LABORATORIUM</div>
            <div className="stat-value">28.4 <span style={{ fontSize: '13px', color: '#64748b' }}>kW</span></div>
            <div className="stat-meta">Total Ampere: 129.2 A</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-red">
            <AlertTriangle size={20} />
          </div>
          <div className="stat-copy">
            <div className="stat-label">MCB OVERLOAD WARNING</div>
            <div className="stat-value" style={{ color: '#f87171' }}>1 <span style={{ fontSize: '13px', color: '#64748b' }}>/ 12 Breakers</span></div>
            <div className="stat-meta">! GK1-303 (Lab 3) PC Group</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-amber">
            <Clock size={20} />
          </div>
          <div className="stat-copy">
            <div className="stat-label">TIKET INSIDEN AKTIF</div>
            <div className="stat-value">5 <span style={{ fontSize: '13px', color: '#64748b' }}>Tiket</span></div>
            <div className="stat-meta" style={{ color: '#f59e0b' }}>2 Urgent Butuh Respon</div>
          </div>
        </div>
      </div>

      {/* Section: 6 Lab MCB Panels */}
      <section className="card" style={{ marginBottom: '22px' }}>
        <div className="card-head">
          <div>
            <div className="eyebrow" style={{ color: '#94a3b8' }}>
              PANEL MONITORING MCB &amp; SUB-DISTRIBUSI KAMPUS
            </div>
            <h2 className="card-title">Monitoring 2 Jalur Utama per Lab: MCB 10A (Stopkontak/PC) &amp; MCB 40A (Heavy Load 4-Split AC)</h2>
          </div>
          <div style={{ display: 'flex', gap: '14px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="badge-dot" style={{ backgroundColor: '#10b981' }} /> Normal (&lt;75%)
            </span>
            <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="badge-dot" style={{ backgroundColor: '#f59e0b' }} /> Waspada (75-89%)
            </span>
            <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="badge-dot" style={{ backgroundColor: '#ef4444' }} /> Kritis (≥90%)
            </span>
          </div>
        </div>

        <div className="labs-grid">
          {panels.map((p) => (
            <div
              key={p.code}
              className={`lab-card ${p.critical ? 'critical' : ''}`}
              style={{ backgroundColor: '#14161a' }}
            >
              <div className="lab-card-head">
                <div>
                  <div className="lab-code">{p.code}</div>
                  <div className="lab-name" style={{ fontSize: '13.5px' }}>{p.name}</div>
                </div>
                <span className={`badge badge-${p.statusTone}`}>
                  <span className="badge-dot" /> {p.status}
                </span>
              </div>

              <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={12} color="#38bdf8" />
                <span>Tegangan Fasa Tunggal:</span>
                <strong className="mono" style={{ color: p.critical ? '#f87171' : '#ffffff' }}>
                  {p.voltage}
                </strong>
              </div>

              {/* MCB 10A */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                  <span style={{ color: p.critical ? '#f87171' : '#94a3b8', fontWeight: p.critical ? 700 : 500 }}>
                    {p.critical ? '! ' : ''}Grup PC — MCB 10A (2.200W)
                  </span>
                  <span className="mono" style={{ color: p.critical ? '#f87171' : '#ffffff', fontWeight: 600 }}>
                    {p.pcPercent}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: p.critical ? '#f87171' : '#ffffff' }}>
                    {p.pcWatt}
                  </span>
                  <span className="mono" style={{ fontSize: '10.5px', color: '#64748b' }}>
                    {p.pcAmp}
                  </span>
                </div>
                <ProgressBar value={p.pcProgress} tone={p.statusTone as any} height={5} />
                {p.subWarning && (
                  <div style={{ fontSize: '10px', color: '#fca5a5', marginTop: '4px', lineHeight: 1.3 }}>
                    {p.subWarning}
                  </div>
                )}
              </div>

              {/* MCB 40A */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                  <span style={{ color: '#94a3b8' }}>Grup AC (4 Split) — MCB 40A</span>
                  <span className="mono" style={{ color: '#ffffff', fontWeight: 600 }}>{p.acPercent}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {p.acWatt}
                  </span>
                  <span className="mono" style={{ fontSize: '10.5px', color: '#64748b' }}>
                    {p.acAmp}
                  </span>
                </div>
                <ProgressBar value={p.acProgress} tone="accent" height={5} />
              </div>

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
                  Standby Vampire: <strong style={{ color: p.critical ? '#f87171' : '#4edea3' }}>{p.vampire}</strong>
                </span>
                {p.critical ? (
                  <button
                    className="btn btn-xs btn-danger"
                    onClick={() => toast.info('Melakukan shedding load otomatis Lab 3...')}
                  >
                    Shed Load
                  </button>
                ) : (
                  <span style={{ color: '#38bdf8', fontSize: '11px', cursor: 'pointer' }}>
                    Diagnostik &gt;
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section: Live Incident Feed Table */}
      <section className="card">
        <div className="card-head">
          <div>
            <div className="eyebrow" style={{ color: '#94a3b8' }}>
              DAFTAR TIKET GANGGUAN LISTRIK &amp; ANOMALI PC
            </div>
            <h2 className="card-title">Antrean perbaikan aktif tim Facility Maintenance UNKLAB untuk mencegah kebakaran &amp; pemborosan energi.</h2>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div className="tab-row">
              <button className={`tab ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>
                Semua ({tickets.length})
              </button>
              <button className={`tab ${filter === 'URGENT' ? 'active' : ''}`} onClick={() => setFilter('URGENT')}>
                Urgent (2)
              </button>
              <button className={`tab ${filter === 'WORKING' ? 'active' : ''}`} onClick={() => setFilter('WORKING')}>
                Sedang Dikerjakan (3)
              </button>
              <button className={`tab ${filter === 'RESOLVED' ? 'active' : ''}`} onClick={() => setFilter('RESOLVED')}>
                Selesai (1)
              </button>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID TIKET</th>
                <th>LOKASI LAB</th>
                <th>JENIS GANGGUAN / ANOMALI</th>
                <th>PELAPOR</th>
                <th>WAKTU</th>
                <th>PRIORITAS</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'right' }}>TINDAKAN FACILITY</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((t) => (
                <tr key={t.id}>
                  <td className="cell-strong">{t.id}</td>
                  <td>
                    <div>
                      <strong>{t.lab}</strong>
                      <div className="cell-muted">{t.sub}</div>
                    </div>
                  </td>
                  <td>
                    <div style={{ maxWidth: '300px' }}>
                      <strong style={{ color: '#ffffff' }}>{t.desc}</strong>
                      <div className="cell-muted" style={{ fontSize: '11px' }}>{t.detail}</div>
                    </div>
                  </td>
                  <td>{t.reporter}</td>
                  <td className="cell-muted">{t.time}</td>
                  <td>
                    <span className={`badge badge-${t.priorityTone}`}>
                      <span className="badge-dot" /> {t.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${t.statusTone}`}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {t.status !== 'SELESAI' ? (
                      <button
                        className="btn btn-xs btn-primary"
                        onClick={() => handleComplete(t.id)}
                      >
                        <CheckCircle2 size={12} />
                        Tandai Selesai
                      </button>
                    ) : (
                      <span className="badge badge-success">✓ Terverifikasi</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
          <span className="cell-muted" style={{ fontSize: '11px' }}>
            Menampilkan {filteredTickets.length} dari {tickets.length} laporan insiden kelistrikan semester ini
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => toast.success('Mengunduh rekap CSV...')}>
              <Download size={14} /> Unduh Rekap Tiket (CSV)
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> Buat Tiket Baru
            </button>
          </div>
        </div>
      </section>

      {/* Modal Buat Tiket Baru */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Buat Tiket Insiden Listrik Baru">
        <form onSubmit={handleCreate}>
          <div className="field">
            <label>Laboratorium</label>
            <select className="input" value={newLab} onChange={(e) => setNewLab(e.target.value)}>
              <option value="1">Lab 1 Komputer Dasar</option>
              <option value="2">Lab 2 Rekayasa Perangkat Lunak</option>
              <option value="3">Lab 3 Jaringan &amp; Keamanan</option>
              <option value="4">Lab 4 AI &amp; Data Science</option>
              <option value="5">Lab 5 Multimedia &amp; Desain</option>
              <option value="6">Lab 6 Riset &amp; Inovasi</option>
            </select>
          </div>
          <div className="field">
            <label>Deskripsi Gangguan / Anomali Listrik</label>
            <textarea
              className="input textarea"
              rows={3}
              placeholder="Contoh: Stopkontak nomor 12 berbau hangus, tegangan drop drastis..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              <Send size={14} /> Terbitkan Tiket
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

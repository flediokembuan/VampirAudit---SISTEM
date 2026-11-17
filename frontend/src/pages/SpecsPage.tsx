import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Edit2,
  Eye,
  Filter,
  HardDrive,
  Layers,
  Monitor,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
  Users,
  Zap,
} from 'lucide-react'
import { api, firstError } from '../lib/api'
import { Badge, Modal } from '../components/ui'
import { useToast } from '../components/ToastProvider'

export default function SpecsPage() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'LABS' | 'RBAC'>('INVENTORY')
  const [selectedLab, setSelectedLab] = useState('ALL')
  const [selectedCondition, setSelectedCondition] = useState('ALL')
  const [createOpen, setCreateOpen] = useState(false)

  const [inventory, setInventory] = useState([
    {
      code: 'LAB1-PC01',
      lab: 'Lab 1 Komputer Dasar',
      sub: 'MCB-B01 / IP: 10.12.1.11',
      spec: 'Core i5-12400 • 16GB • 512GB',
      power: '145W Aktif / 3.8W Standby',
      status: 'Normal',
      statusTone: 'success',
      audited: 'Hari ini, 09:15',
      auditor: 'Auditor: Mario K.',
    },
    {
      code: 'LAB1-PC08',
      lab: 'Lab 1 Komputer Dasar',
      sub: 'MCB-B01 / IP: 10.12.1.18',
      spec: 'Core i5-12400 • 16GB • 512GB',
      power: '152W Aktif / 6.9W Standby',
      status: 'Standby Boros',
      statusTone: 'warning',
      audited: 'Kemarin, 17:30',
      auditor: 'Auditor: Mario K.',
    },
    {
      code: 'LAB2-PC15',
      lab: 'Lab 2 Rekayasa Perangkat Lunak',
      sub: 'MCB-B03 / IP: 10.12.2.25',
      spec: 'Ryzen 7 5700X • 32GB • 1TB NVMe',
      power: '190W Aktif / 4.2W Standby',
      status: 'Normal',
      statusTone: 'success',
      audited: '21 Okt, 14:10',
      auditor: 'Auditor: Sarah T.',
    },
    {
      code: 'LAB3-PC29',
      lab: 'Lab 3 Jaringan & Keamanan',
      sub: 'MCB-B06 / IP: 10.12.3.39',
      spec: 'Core i7-11700 • 32GB Dual NIC',
      power: 'ERR (0.0W Aktif) / 14.2W Standby',
      status: 'Anomali PSU',
      statusTone: 'danger',
      audited: '20 Okt, 11:05',
      auditor: 'Auditor: Juan W.',
    },
    {
      code: 'LAB5-PC02',
      lab: 'Lab 5 AI & Data Science',
      sub: 'MCB-B09 / IP: 10.12.5.12',
      spec: 'RTX 4070 • i7-13700KF • 64GB',
      power: '310W Aktif / 4.5W Standby',
      status: 'Normal',
      statusTone: 'success',
      audited: 'Hari ini, 08:30',
      auditor: 'Auditor: Sarah T.',
    },
    {
      code: 'LAB4-PC19',
      lab: 'Lab 4 Multimedia & Desain',
      sub: 'MCB-B07 / IP: 10.12.4.29',
      spec: 'Apple M2 Mac Mini • 16GB',
      power: '65W Aktif / 1.8W Standby',
      status: 'Normal',
      statusTone: 'success',
      audited: '19 Okt, 16:40',
      auditor: 'Auditor: Juan W.',
    },
    {
      code: 'LAB6-PC33',
      lab: 'Lab 6 Pemrograman Web',
      sub: 'MCB-B12 / IP: 10.12.6.43',
      spec: 'Core i5-11400 • 16GB • 256GB SSD',
      power: '138W Aktif / 3.9W Standby',
      status: 'Normal',
      statusTone: 'success',
      audited: '18 Okt, 10:20',
      auditor: 'Auditor: Mario K.',
    },
  ])

  function handleDelete(code: string) {
    setInventory((prev) => prev.filter((item) => item.code !== code))
    toast.success(`Unit ${code} telah dinonaktifkan dari inventaris.`)
  }

  return (
    <>
      {/* Header Info matching Screen 6 */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ color: '#94a3b8' }}>
            ADMINISTRASI SISTEM &gt; MASTER DATA &amp; PENGATURAN
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1>Manajemen Master Data &amp; Hak Akses Pengguna (RBAC)</h1>
            <span className="badge badge-success" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
              ROOT-SEC
            </span>
          </div>
          <p>
            Kelola 240 unit PC inventaris laboratorium, parameter batas MCB cerdas, dan otorisasi matriks 4
            peran pengguna Fakultas Ilmu Komputer.
          </p>
        </div>

        <div className="head-actions-row">
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              TOTAL UNITS: <strong style={{ color: '#ffffff', marginLeft: '4px' }}>● 240 ONLINE</strong>
            </span>
            <span className="badge badge-warning" style={{ padding: '6px 12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              VAMPIRE ALERTS: <strong style={{ color: '#ffffff', marginLeft: '4px' }}>△ 14 &gt;5.0W</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 3 Top Tabs */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #26292e', marginBottom: '18px' }}>
        <button
          className={`subnav-link ${activeTab === 'INVENTORY' ? 'active' : ''}`}
          onClick={() => setActiveTab('INVENTORY')}
        >
          <Monitor size={15} />
          <span>Master Inventaris 240 PC</span>
          <span className="subnav-badge">240</span>
        </button>

        <button
          className={`subnav-link ${activeTab === 'LABS' ? 'active' : ''}`}
          onClick={() => setActiveTab('LABS')}
        >
          <Layers size={15} />
          <span>Konfigurasi 6 Lab &amp; MCB</span>
          <span className="subnav-badge">6 Labs</span>
        </button>

        <button
          className={`subnav-link ${activeTab === 'RBAC' ? 'active' : ''}`}
          onClick={() => setActiveTab('RBAC')}
        >
          <Users size={15} />
          <span>Akun Pengguna &amp; Hak Akses RBAC</span>
          <span className="subnav-badge">15 Users</span>
        </button>
      </div>

      {/* Toolbar Filters */}
      <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
        <div className="toolbar-filters">
          <select
            className="input input-sm"
            value={selectedLab}
            onChange={(e) => setSelectedLab(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="ALL">Semua Laboratorium (6)</option>
            <option value="Lab 1">Lab 1 Komputer Dasar</option>
            <option value="Lab 2">Lab 2 RPL</option>
            <option value="Lab 3">Lab 3 Jaringan &amp; Keamanan</option>
            <option value="Lab 4">Lab 4 Multimedia</option>
            <option value="Lab 5">Lab 5 AI &amp; Data Science</option>
            <option value="Lab 6">Lab 6 Pemrograman Web</option>
          </select>

          <select
            className="input input-sm"
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="ALL">Semua Kondisi (240)</option>
            <option value="Normal">Normal</option>
            <option value="Standby Boros">Standby Boros</option>
            <option value="Anomali PSU">Anomali PSU</option>
          </select>

          <button className="btn btn-sm btn-secondary" onClick={() => toast.success('Mengekspor data CSV...')}>
            <Download size={13} /> Ekspor CSV/Excel
          </button>

          <button className="btn btn-sm btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={13} /> Tambah Data Baru
          </button>
        </div>
      </div>

      {/* Two-Column Grid: 2/3 Table + 1/3 Right Sidebar Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1.1fr', gap: '20px' }}>
        {/* Left Table Section */}
        <div className="card" style={{ padding: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              fontSize: '11px',
              color: '#94a3b8',
            }}
          >
            <div>
              <span className="mono" style={{ color: '#10b981', fontWeight: 700 }}>240 Records</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <span>Sinkronisasi telemetry MCB aktif: 32 detik yang lalu</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{ color: '#38bdf8', fontSize: '11px', background: 'none' }}
                onClick={() => toast.info('Memuat ulang data telemetri...')}
              >
                ↺ Muat Ulang
              </button>
              <span>•</span>
              <button
                style={{ color: '#94a3b8', fontSize: '11px', background: 'none' }}
                onClick={() => toast.info('Kolom kustom')}
              >
                Kolom Kustom
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}>
                    <input type="checkbox" style={{ accentColor: '#10b981' }} />
                  </th>
                  <th>KODE PC</th>
                  <th>RUANG LABORATORIUM</th>
                  <th>SPESIFIKASI HARDWARE</th>
                  <th>PROFIL KALIBRASI DAYA</th>
                  <th>STATUS KONDISI</th>
                  <th>TERAKHIR DIVERIFIKASI</th>
                  <th style={{ textAlign: 'right' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((row) => (
                  <tr key={row.code}>
                    <td>
                      <input type="checkbox" style={{ accentColor: '#10b981' }} />
                    </td>
                    <td className="cell-strong" style={{ color: '#ffffff' }}>
                      {row.code}
                    </td>
                    <td>
                      <div>
                        <strong>{row.lab}</strong>
                        <div className="cell-muted" style={{ fontSize: '10.5px' }}>{row.sub}</div>
                      </div>
                    </td>
                    <td className="cell-muted" style={{ fontSize: '11.5px' }}>{row.spec}</td>
                    <td>
                      <strong className="mono" style={{ color: row.statusTone === 'danger' ? '#f87171' : '#ffffff' }}>
                        {row.power}
                      </strong>
                    </td>
                    <td>
                      <span className={`badge badge-${row.statusTone}`}>
                        <span className="badge-dot" /> {row.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '11px' }}>
                        <div>{row.audited}</div>
                        <div className="cell-muted">{row.auditor}</div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                        <button
                          className="icon-btn"
                          style={{ width: '26px', height: '26px' }}
                          onClick={() => toast.info(`Edit ${row.code}`)}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          className="icon-btn"
                          style={{ width: '26px', height: '26px', color: '#f87171' }}
                          onClick={() => handleDelete(row.code)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination matching Screen 6 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '14px',
              fontSize: '11px',
              color: '#94a3b8',
            }}
          >
            <span>Menampilkan 1-7 dari 240 unit PC inventaris | Lab 1 s/d Lab 6</span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button className="btn btn-xs btn-secondary">&lt;</button>
              <button className="btn btn-xs btn-primary">1</button>
              <button className="btn btn-xs btn-secondary">2</button>
              <button className="btn btn-xs btn-secondary">3</button>
              <span>...</span>
              <button className="btn btn-xs btn-secondary">35</button>
              <button className="btn btn-xs btn-secondary">&gt;</button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: 6 Lab Distribution Donut + RBAC 15 User Summary + Facility Photo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. Donut Card: Distribusi 6 Lab */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div className="card-head" style={{ marginBottom: '8px' }}>
              <div>
                <h3 className="card-title" style={{ fontSize: '13.5px' }}>
                  Distribusi 6 Lab <span style={{ color: '#94a3b8', fontSize: '11px' }}>40 PC / Lab</span>
                </h3>
                <p className="card-sub" style={{ fontSize: '11px' }}>
                  Kapasitas seragam 40 workstation per ruangan dengan sensor IoT terintegrasi.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '14px 0' }}>
              {/* Donut graphic */}
              <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#26292e" strokeWidth="4.5" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="4.5" strokeDasharray="16.6 100" strokeDashoffset="0" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#0ea5e9" strokeWidth="4.5" strokeDasharray="16.6 100" strokeDashoffset="-16.6" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#38bdf8" strokeWidth="4.5" strokeDasharray="16.6 100" strokeDashoffset="-33.2" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f97316" strokeWidth="4.5" strokeDasharray="16.6 100" strokeDashoffset="-49.8" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4.5" strokeDasharray="16.6 100" strokeDashoffset="-66.4" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#a78bfa" strokeWidth="4.5" strokeDasharray="16.6 100" strokeDashoffset="-83" />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  <span style={{ fontSize: '13px', color: '#ffffff' }}>240</span>
                  <span style={{ fontSize: '7.5px', color: '#94a3b8' }}>TOTAL PC</span>
                </div>
              </div>

              {/* Legend 6 labs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '10.5px' }}>
                <span style={{ color: '#10b981' }}>● Lab 1 (Dasar)</span>
                <span style={{ color: '#0ea5e9' }}>● Lab 2 (RPL)</span>
                <span style={{ color: '#38bdf8' }}>● Lab 3 (Jaringan)</span>
                <span style={{ color: '#f97316' }}>● Lab 4 (Multimedia)</span>
                <span style={{ color: '#f59e0b' }}>● Lab 5 (AI &amp; Data)</span>
                <span style={{ color: '#a78bfa' }}>● Lab 6 (Web)</span>
              </div>
            </div>
          </div>

          {/* 2. RBAC Summary Card: Hak Akses RBAC 15 User */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} color="#4edea3" />
                <h3 className="card-title" style={{ fontSize: '13.5px' }}>Hak Akses RBAC (15 User)</h3>
              </div>
              <Link to="/users" style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>
                Kelola Role
              </Link>
            </div>
            <p className="card-sub" style={{ fontSize: '11px', marginBottom: '14px' }}>
              Matriks pembatasan wewenang sistem telemetri kampus.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#131518', borderRadius: '8px' }}>
                <div>
                  <strong style={{ fontSize: '11.5px', color: '#4edea3' }}>Dosen Admin</strong>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Akses Penuh / Master / DB</div>
                </div>
                <span className="mono" style={{ fontSize: '12px', fontWeight: 700 }}>2 Akun</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#131518', borderRadius: '8px' }}>
                <div>
                  <strong style={{ fontSize: '11.5px', color: '#38bdf8' }}>Auditor Lapangan</strong>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Input Form Audit &amp; Verifikasi</div>
                </div>
                <span className="mono" style={{ fontSize: '12px', fontWeight: 700 }}>6 Akun</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#131518', borderRadius: '8px' }}>
                <div>
                  <strong style={{ fontSize: '11.5px', color: '#fbbf24' }}>Facility Maintenance</strong>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Trip MCB &amp; Service Alert</div>
                </div>
                <span className="mono" style={{ fontSize: '12px', fontWeight: 700 }}>4 Akun</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#131518', borderRadius: '8px' }}>
                <div>
                  <strong style={{ fontSize: '11.5px', color: '#a78bfa' }}>Pimpinan Kampus</strong>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Read-Only KPI &amp; Rupiah Burn</div>
                </div>
                <span className="mono" style={{ fontSize: '12px', fontWeight: 700 }}>3 Akun</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #26292e', paddingTop: '10px', marginTop: '12px', fontSize: '10.5px', color: '#10b981' }}>
              ✓ Audit log RBAC: Terakhir diubah oleh Dr. R. Palit (Kemarin 19:40).
            </div>
          </div>

          {/* 3. Facility Hardware Card */}
          <div className="card" style={{ padding: '16px 18px', backgroundColor: '#131518' }}>
            <span className="eyebrow" style={{ fontSize: '9px', color: '#94a3b8' }}>
              FASILITAS HARDWARE TERKINI • FIK UNKLAB
            </span>
            <div
              style={{
                marginTop: '8px',
                height: '80px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #14231b, #0f1c24)',
                border: '1px solid #26292e',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                padding: '10px 12px',
              }}
            >
              <div>
                <strong style={{ fontSize: '12px', color: '#ffffff' }}>Lab 2 RPL Workstations</strong>
                <div style={{ fontSize: '10px', color: '#4edea3', fontFamily: 'var(--font-mono)' }}>
                  v-Node Rev 3.2
                </div>
              </div>
              <span className="badge badge-success" style={{ fontSize: '9px' }}>Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Tambah Data Baru */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tambah Unit PC Baru">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            toast.success('Unit baru berhasil ditambahkan!')
            setCreateOpen(false)
          }}
        >
          <div className="field">
            <label>Kode PC</label>
            <input className="input" placeholder="contoh: LAB1-PC41" required />
          </div>
          <div className="field">
            <label>Laboratorium</label>
            <select className="input">
              <option>Lab 1 Komputer Dasar</option>
              <option>Lab 2 Rekayasa Perangkat Lunak</option>
              <option>Lab 3 Jaringan &amp; Keamanan</option>
              <option>Lab 4 AI &amp; Data Science</option>
              <option>Lab 5 Multimedia &amp; Desain</option>
              <option>Lab 6 Riset &amp; Inovasi</option>
            </select>
          </div>
          <div className="field">
            <label>Spesifikasi Hardware</label>
            <input className="input" placeholder="contoh: Core i5-12400 • 16GB • 512GB" required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Simpan Data
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

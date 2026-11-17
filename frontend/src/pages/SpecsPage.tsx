import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Download,
  Layers,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react'
import { api, firstError } from '../lib/api'
import { number, relativeTime } from '../lib/format'
import { ErrorState, Modal, PageLoader } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import type { AppUser, AuditLog, LabRoom, Paginated, Role, Spec } from '../types'

const PAGE_SIZE = 10

export default function SpecsPage() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'LABS' | 'RBAC'>('INVENTORY')
  const [selectedLab, setSelectedLab] = useState('ALL')
  const [selectedCondition, setSelectedCondition] = useState('ALL')
  const [page, setPage] = useState(1)

  const [audits, setAudits] = useState<AuditLog[]>([])
  const [specs, setSpecs] = useState<Spec[]>([])
  const [labs, setLabs] = useState<LabRoom[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [auditModalOpen, setAuditModalOpen] = useState(false)
  const [editingAudit, setEditingAudit] = useState<AuditLog | null>(null)
  const [formLabId, setFormLabId] = useState('')
  const [formPcNumber, setFormPcNumber] = useState('')
  const [formSpecId, setFormSpecId] = useState('')
  const [formFaulty, setFormFaulty] = useState(false)
  const [formFaultNote, setFormFaultNote] = useState('')
  const [savingAudit, setSavingAudit] = useState(false)
  const [auditError, setAuditError] = useState('')

  const [specModalOpen, setSpecModalOpen] = useState(false)
  const [specRam, setSpecRam] = useState('16')
  const [specStorage, setSpecStorage] = useState('512')
  const [specStorageType, setSpecStorageType] = useState<'SSD' | 'HDD' | 'NVME'>('SSD')
  const [specCpu, setSpecCpu] = useState('')
  const [specWatt, setSpecWatt] = useState('4.5')
  const [savingSpec, setSavingSpec] = useState(false)
  const [specError, setSpecError] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const [auditsRes, specsRes, labsRes, usersRes] = await Promise.all([
        api.get<Paginated<AuditLog>>('/audits', { per_page: 100 }),
        api.get<{ data: Spec[] }>('/specs', { include_inactive: 1 }),
        api.get<{ data: LabRoom[] }>('/labs', { include_inactive: 1 }),
        api.get<Paginated<AppUser>>('/users'),
      ])
      setAudits(auditsRes.data)
      setSpecs(specsRes.data)
      setLabs(labsRes.data)
      setUsers(usersRes.data)
      if (labsRes.data.length > 0) setFormLabId((prev) => prev || String(labsRes.data[0].id))
      if (specsRes.data.length > 0) setFormSpecId((prev) => prev || String(specsRes.data[0].id))
      setError('')
    } catch (caught) {
      setError(firstError(caught))
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredAudits = useMemo(() => {
    return audits.filter((row) => {
      if (selectedLab !== 'ALL' && String(row.lab_room_id) !== selectedLab) return false
      if (selectedCondition === 'FAULTY' && !row.is_faulty) return false
      if (selectedCondition === 'STANDBY' && (row.is_faulty || row.spec.standby_watt <= 5)) return false
      if (selectedCondition === 'NORMAL' && (row.is_faulty || row.spec.standby_watt > 5 || row.spec.standby_watt === 0)) return false
      if (selectedCondition === 'OFF' && (row.is_faulty || row.spec.standby_watt !== 0)) return false
      return true
    })
  }, [audits, selectedLab, selectedCondition])

  const totalPages = Math.max(Math.ceil(filteredAudits.length / PAGE_SIZE), 1)
  const safePage = Math.min(page, totalPages)
  const paginatedAudits = filteredAudits.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const roleCounts = useMemo(() => {
    const counts: Record<Role, number> = { ADMIN: 0, AUDITOR: 0, MAINTENANCE: 0, PIMPINAN: 0 }
    for (const u of users) {
      if (u.is_active) counts[u.role] += 1
    }
    return counts
  }, [users])

  const highStandbyCount = useMemo(
    () => audits.filter((a) => a.spec.standby_watt > 5 || a.is_faulty).length,
    [audits],
  )

  function openCreateAudit() {
    setEditingAudit(null)
    setFormLabId(labs[0] ? String(labs[0].id) : '')
    setFormPcNumber('')
    setFormSpecId(specs[0] ? String(specs[0].id) : '')
    setFormFaulty(false)
    setFormFaultNote('')
    setAuditError('')
    setAuditModalOpen(true)
  }

  function openEditAudit(audit: AuditLog) {
    setEditingAudit(audit)
    setFormLabId(String(audit.lab_room_id))
    setFormPcNumber(audit.pc_number)
    setFormSpecId(String(audit.master_pc_spec_id))
    setFormFaulty(audit.is_faulty)
    setFormFaultNote(audit.fault_note ?? '')
    setAuditError('')
    setAuditModalOpen(true)
  }

  async function handleSaveAudit(event: FormEvent) {
    event.preventDefault()
    setSavingAudit(true)
    setAuditError('')
    try {
      if (editingAudit) {
        await api.patch(`/audits/${editingAudit.id}`, {
          pc_number: formPcNumber.trim(),
          master_pc_spec_id: Number(formSpecId),
          is_faulty: formFaulty,
          fault_note: formFaulty ? formFaultNote.trim() || null : null,
        })
        toast.success(`Data unit ${formPcNumber.trim()} diperbarui.`)
      } else {
        await api.post('/audits', {
          lab_room_id: Number(formLabId),
          pc_number: formPcNumber.trim(),
          master_pc_spec_id: Number(formSpecId),
          is_faulty: formFaulty,
          fault_note: formFaulty ? formFaultNote.trim() || null : null,
        })
        toast.success(`Unit ${formPcNumber.trim()} berhasil ditambahkan!`)
      }
      setAuditModalOpen(false)
      await load(true)
    } catch (caught) {
      setAuditError(firstError(caught))
    } finally {
      setSavingAudit(false)
    }
  }

  async function handleDeleteAudit(audit: AuditLog) {
    if (!window.confirm(`Hapus catatan audit ${audit.pc_number} (${audit.lab_name ?? 'Lab'})?`)) return
    try {
      await api.delete(`/audits/${audit.id}`)
      toast.success(`Unit ${audit.pc_number} telah dihapus dari inventaris audit.`)
      await load(true)
    } catch (caught) {
      toast.error(firstError(caught))
    }
  }

  async function handleCreateSpec(event: FormEvent) {
    event.preventDefault()
    setSavingSpec(true)
    setSpecError('')
    try {
      await api.post('/specs', {
        ram_gb: Number(specRam),
        storage_gb: Number(specStorage),
        storage_type: specStorageType,
        cpu: specCpu.trim() || null,
        standby_watt: Number(specWatt),
        is_active: true,
      })
      setSpecModalOpen(false)
      setSpecCpu('')
      toast.success('Spesifikasi hardware master berhasil ditambahkan!')
      await load(true)
    } catch (caught) {
      setSpecError(firstError(caught))
    } finally {
      setSavingSpec(false)
    }
  }

  function handleExportCsv() {
    const headers = ['Kode PC', 'Lab', 'Spesifikasi', 'Standby (W)', 'Status', 'Auditor', 'Waktu Audit']
    const rows = filteredAudits.map((row) => [
      row.pc_number,
      `"${row.lab_name ?? ''}"`,
      `"${row.spec.label}"`,
      row.spec.standby_watt,
      row.is_faulty ? 'Anomali' : row.spec.standby_watt === 0 ? 'Mati (0W)' : row.spec.standby_watt > 5 ? 'Standby Boros' : 'Normal',
      `"${row.auditor?.name ?? ''}"`,
      row.audited_at,
    ].join(','))
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventaris-pc-vampir-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Data inventaris CSV berhasil diunduh.')
  }

  if (loading && audits.length === 0) return <PageLoader label="Memuat master data & inventaris PC..." />
  if (error && audits.length === 0) return <ErrorState message={error} onRetry={() => void load()} />

  return (
    <>
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
            Kelola {audits.length} unit PC teraudit di {labs.length} laboratorium, master spesifikasi daya standby, dan {users.length} akun RBAC.
          </p>
        </div>

        <div className="head-actions-row">
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              AUDITED UNITS: <strong style={{ color: '#ffffff', marginLeft: '4px' }}>● {audits.length} RECORDS</strong>
            </span>
            <span className="badge badge-warning" style={{ padding: '6px 12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              HIGH / FAULTY: <strong style={{ color: '#ffffff', marginLeft: '4px' }}>△ {highStandbyCount}</strong>
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #26292e', marginBottom: '18px' }}>
        <button
          type="button"
          className={`subnav-link ${activeTab === 'INVENTORY' ? 'active' : ''}`}
          onClick={() => setActiveTab('INVENTORY')}
        >
          <Monitor size={15} />
          <span>Master Inventaris PC</span>
          <span className="subnav-badge">{audits.length}</span>
        </button>

        <button
          type="button"
          className={`subnav-link ${activeTab === 'LABS' ? 'active' : ''}`}
          onClick={() => setActiveTab('LABS')}
        >
          <Layers size={15} />
          <span>Konfigurasi {labs.length} Lab &amp; Master Spec</span>
          <span className="subnav-badge">{specs.length} Spec</span>
        </button>

        <button
          type="button"
          className={`subnav-link ${activeTab === 'RBAC' ? 'active' : ''}`}
          onClick={() => setActiveTab('RBAC')}
        >
          <Users size={15} />
          <span>Akun Pengguna &amp; Hak Akses RBAC</span>
          <span className="subnav-badge">{users.length} Users</span>
        </button>
      </div>

      <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
        <div className="toolbar-filters">
          {activeTab === 'INVENTORY' && (
            <>
              <label htmlFor="specsLabFilter" className="visually-hidden">Filter Laboratorium</label>
              <select
                id="specsLabFilter"
                className="input input-sm"
                value={selectedLab}
                onChange={(e) => {
                  setSelectedLab(e.target.value)
                  setPage(1)
                }}
                style={{ width: 'auto' }}
              >
                <option value="ALL">Semua Laboratorium ({labs.length})</option>
                {labs.map((lab) => (
                  <option key={lab.id} value={String(lab.id)}>{lab.name}</option>
                ))}
              </select>

              <label htmlFor="specsCondFilter" className="visually-hidden">Filter Kondisi</label>
              <select
                id="specsCondFilter"
                className="input input-sm"
                value={selectedCondition}
                onChange={(e) => {
                  setSelectedCondition(e.target.value)
                  setPage(1)
                }}
                style={{ width: 'auto' }}
              >
                <option value="ALL">Semua Kondisi ({audits.length})</option>
                <option value="OFF">Mati Total (0W)</option>
                <option value="NORMAL">Normal (&le;5W)</option>
                <option value="STANDBY">Standby Boros (&gt;5W)</option>
                <option value="FAULTY">Anomali / Bermasalah</option>
              </select>

              <button type="button" className="btn btn-sm btn-secondary" onClick={handleExportCsv}>
                <Download size={13} /> Ekspor CSV
              </button>

              <button type="button" className="btn btn-sm btn-primary" onClick={openCreateAudit}>
                <Plus size={13} /> Tambah Audit PC
              </button>
            </>
          )}

          {activeTab === 'LABS' && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                setSpecError('')
                setSpecModalOpen(true)
              }}
            >
              <Plus size={13} /> Tambah Master Spec
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1.1fr', gap: '20px' }}>
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
              <span className="mono" style={{ color: '#10b981', fontWeight: 700 }}>
                {activeTab === 'INVENTORY' ? `${filteredAudits.length} Records` : activeTab === 'LABS' ? `${specs.length} Spesifikasi` : `${users.length} Pengguna`}
              </span>
              <span style={{ margin: '0 8px' }}>•</span>
              <span>Terhubung langsung dengan database</span>
            </div>
            <button
              type="button"
              style={{ color: '#38bdf8', fontSize: '11px', background: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={() => void load()}
              disabled={refreshing}
            >
              <RefreshCw size={12} className={refreshing ? 'spin' : ''} /> Muat Ulang
            </button>
          </div>

          {activeTab === 'INVENTORY' && (
            <>
              <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabel inventaris PC hasil audit">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>KODE PC</th>
                      <th>RUANG LABORATORIUM</th>
                      <th>SPESIFIKASI HARDWARE</th>
                      <th>DAYA STANDBY</th>
                      <th>STATUS KONDISI</th>
                      <th>TERAKHIR DIVERIFIKASI</th>
                      <th style={{ textAlign: 'right' }}>AKSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAudits.map((row) => {
                      const statusLabel = row.is_faulty
                        ? 'Anomali'
                        : row.spec.standby_watt === 0
                          ? 'Mati (0W)'
                          : row.spec.standby_watt > 5
                            ? 'Standby Boros'
                            : 'Normal'
                      const statusTone = row.is_faulty ? 'danger' : row.spec.standby_watt > 5 ? 'warning' : 'success'
                      return (
                        <tr key={row.id}>
                          <td className="cell-strong" style={{ color: '#ffffff' }}>{row.pc_number}</td>
                          <td>
                            <strong>{row.lab_name ?? `Lab ${row.lab_room_id}`}</strong>
                          </td>
                          <td className="cell-muted" style={{ fontSize: '11.5px' }}>{row.spec.label}</td>
                          <td>
                            <strong className="mono" style={{ color: row.is_faulty ? '#f87171' : '#ffffff' }}>
                              {number(row.spec.standby_watt, 2)} W
                            </strong>
                          </td>
                          <td>
                            <span className={`badge badge-${statusTone}`}>
                              <span className="badge-dot" /> {statusLabel}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '11px' }}>
                              <div>{relativeTime(row.audited_at)}</div>
                              <div className="cell-muted">{row.auditor?.name ?? 'Auditor'}</div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                              <button
                                type="button"
                                className="icon-btn"
                                style={{ width: '26px', height: '26px' }}
                                aria-label={`Edit ${row.pc_number}`}
                                onClick={() => openEditAudit(row)}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn"
                                style={{ width: '26px', height: '26px', color: '#f87171' }}
                                aria-label={`Hapus ${row.pc_number}`}
                                onClick={() => void handleDeleteAudit(row)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

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
                <span>
                  Menampilkan {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filteredAudits.length)} dari {filteredAudits.length} unit PC
                </span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-xs btn-secondary"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  >
                    &lt;
                  </button>
                  <span className="mono" style={{ padding: '0 8px' }}>
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-xs btn-secondary"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'LABS' && (
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Daftar spesifikasi hardware master">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SPESIFIKASI</th>
                    <th>CPU</th>
                    <th>STANDBY MASTER</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {specs.map((spec) => (
                    <tr key={spec.id}>
                      <td className="cell-strong">{spec.ram_gb} GB RAM · {spec.storage_gb} GB {spec.storage_type}</td>
                      <td className="cell-muted">{spec.cpu ?? '—'}</td>
                      <td className="mono">{number(spec.standby_watt, 2)} W</td>
                      <td>
                        <span className={`badge badge-${spec.is_active ? 'success' : 'neutral'}`}>
                          {spec.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'RBAC' && (
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Daftar akun pengguna RBAC">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>NAMA</th>
                    <th>EMAIL</th>
                    <th>PERAN</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="cell-strong">{u.name}</td>
                      <td className="cell-muted">{u.email}</td>
                      <td><span className="badge badge-info">{u.role_label}</span></td>
                      <td>
                        <span className={`badge badge-${u.is_active ? 'success' : 'neutral'}`}>
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ padding: '16px 18px' }}>
            <div className="card-head" style={{ marginBottom: '8px' }}>
              <div>
                <h3 className="card-title" style={{ fontSize: '13.5px' }}>
                  Distribusi {labs.length} Lab <span style={{ color: '#94a3b8', fontSize: '11px' }}>({labs.reduce((s, l) => s + l.capacity, 0)} PC Target)</span>
                </h3>
                <p className="card-sub" style={{ fontSize: '11px' }}>
                  Progress audit per ruang laboratorium komputer.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {labs.map((lab) => (
                <div key={lab.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', padding: '6px 8px', backgroundColor: '#131518', borderRadius: '6px' }}>
                  <span>{lab.name}</span>
                  <span className="mono" style={{ color: '#4edea3' }}>
                    {lab.audited_count ?? 0}/{lab.capacity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} color="#4edea3" />
                <h3 className="card-title" style={{ fontSize: '13.5px' }}>Hak Akses RBAC ({users.length} User)</h3>
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
                <span className="mono" style={{ fontSize: '12px', fontWeight: 700 }}>{roleCounts.ADMIN} Akun</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#131518', borderRadius: '8px' }}>
                <div>
                  <strong style={{ fontSize: '11.5px', color: '#38bdf8' }}>Auditor Lapangan</strong>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Input Form Audit &amp; Verifikasi</div>
                </div>
                <span className="mono" style={{ fontSize: '12px', fontWeight: 700 }}>{roleCounts.AUDITOR} Akun</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#131518', borderRadius: '8px' }}>
                <div>
                  <strong style={{ fontSize: '11.5px', color: '#fbbf24' }}>Facility Maintenance</strong>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Trip MCB &amp; Service Alert</div>
                </div>
                <span className="mono" style={{ fontSize: '12px', fontWeight: 700 }}>{roleCounts.MAINTENANCE} Akun</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#131518', borderRadius: '8px' }}>
                <div>
                  <strong style={{ fontSize: '11.5px', color: '#a78bfa' }}>Pimpinan Kampus</strong>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Read-Only KPI &amp; Laporan PDF</div>
                </div>
                <span className="mono" style={{ fontSize: '12px', fontWeight: 700 }}>{roleCounts.PIMPINAN} Akun</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        title={editingAudit ? `Ubah Catatan ${editingAudit.pc_number}` : 'Tambah Catatan Audit PC'}
      >
        <form onSubmit={handleSaveAudit} className="form-stack">
          {!editingAudit && (
            <div className="field">
              <label htmlFor="modalAuditLab">Laboratorium</label>
              <select
                id="modalAuditLab"
                name="lab_room_id"
                className="input"
                value={formLabId}
                onChange={(e) => setFormLabId(e.target.value)}
                required
              >
                {labs.map((lab) => (
                  <option key={lab.id} value={lab.id}>{lab.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="modalAuditPc">Kode PC</label>
            <input
              id="modalAuditPc"
              name="pc_number"
              className="input"
              placeholder="contoh: PC-40"
              value={formPcNumber}
              onChange={(e) => setFormPcNumber(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="modalAuditSpec">Spesifikasi Hardware</label>
            <select
              id="modalAuditSpec"
              name="master_pc_spec_id"
              className="input"
              value={formSpecId}
              onChange={(e) => setFormSpecId(e.target.value)}
              required
            >
              {specs.map((s) => (
                <option key={s.id} value={s.id}>{s.label} ({s.standby_watt}W)</option>
              ))}
            </select>
          </div>
          <label className="checklist-item">
            <input type="checkbox" checked={formFaulty} onChange={(e) => setFormFaulty(e.target.checked)} style={{ accentColor: '#ef4444' }} />
            <span>Tandai unit bermasalah / anomali</span>
          </label>
          {formFaulty && (
            <div className="field">
              <label htmlFor="modalAuditNote">Catatan Kendala</label>
              <textarea
                id="modalAuditNote"
                name="fault_note"
                className="input textarea"
                rows={2}
                value={formFaultNote}
                onChange={(e) => setFormFaultNote(e.target.value)}
              />
            </div>
          )}
          {auditError && <div className="inline-error" role="alert" aria-live="polite">{auditError}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setAuditModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingAudit}>
              {savingAudit ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={specModalOpen} onClose={() => setSpecModalOpen(false)} title="Tambah Spesifikasi Hardware Master">
        <form onSubmit={handleCreateSpec} className="form-stack">
          <div className="field">
            <label htmlFor="specRam">RAM (GB)</label>
            <input id="specRam" name="ram_gb" type="number" min="1" max="1024" className="input" value={specRam} onChange={(e) => setSpecRam(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="specStorage">Kapasitas Storage (GB)</label>
            <input id="specStorage" name="storage_gb" type="number" min="1" max="100000" className="input" value={specStorage} onChange={(e) => setSpecStorage(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="specType">Tipe Storage</label>
            <select id="specType" name="storage_type" className="input" value={specStorageType} onChange={(e) => setSpecStorageType(e.target.value as 'SSD' | 'HDD' | 'NVME')}>
              <option value="SSD">SSD</option>
              <option value="NVME">NVME</option>
              <option value="HDD">HDD</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="specCpu">CPU (opsional)</label>
            <input id="specCpu" name="cpu" className="input" placeholder="contoh: Intel Core i5-12400" value={specCpu} onChange={(e) => setSpecCpu(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="specWatt">Daya Standby Master (Watt)</label>
            <input id="specWatt" name="standby_watt" type="number" min="0.1" step="0.1" className="input" value={specWatt} onChange={(e) => setSpecWatt(e.target.value)} required />
          </div>
          {specError && <div className="inline-error" role="alert" aria-live="polite">{specError}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setSpecModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingSpec}>
              {savingSpec ? 'Menyimpan...' : 'Simpan Spec'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

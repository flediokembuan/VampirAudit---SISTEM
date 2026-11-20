import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  Cpu,
  Layers,
  Monitor,
  Plus,
  RefreshCw,
  Users,
  Zap,
} from 'lucide-react'
import { api, clearApiCache, firstError } from '../lib/api'
import { number } from '../lib/format'
import { ErrorState, Modal, PageLoader } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import type { AppUser, AuditLog, LabRoom, Paginated, Role, Spec } from '../types'

export default function SpecsPage() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'SPECS' | 'RBAC'>('SPECS')

  const [audits, setAudits] = useState<AuditLog[]>([])
  const [specs, setSpecs] = useState<Spec[]>([])
  const [labs, setLabs] = useState<LabRoom[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Spec create / edit modal
  const [specModalOpen, setSpecModalOpen] = useState(false)
  const [editingSpec, setEditingSpec] = useState<Spec | null>(null)
  const [specRam, setSpecRam] = useState('16')
  const [specStorage, setSpecStorage] = useState('512')
  const [specStorageType, setSpecStorageType] = useState<'SSD' | 'HDD' | 'NVME'>('NVME')
  const [specCpu, setSpecCpu] = useState('DDR4/DDR5')
  const [specWatt, setSpecWatt] = useState('5')
  const [savingSpec, setSavingSpec] = useState(false)
  const [specError, setSpecError] = useState('')

  // User edit modal (RBAC)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [userRole, setUserRole] = useState<Role>('AUDITOR')
  const [userActive, setUserActive] = useState(true)
  const [savingUser, setSavingUser] = useState(false)
  const [userError, setUserError] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      clearApiCache()
      setRefreshing(true)
    }
    try {
      const [auditsRes, specsRes, labsRes, usersRes] = await Promise.all([
        api.get<Paginated<AuditLog>>('/audits', { per_page: 300 }),
        api.get<{ data: Spec[] }>('/specs', { include_inactive: 1 }),
        api.get<{ data: LabRoom[] }>('/labs', { include_inactive: 1 }),
        api.get<Paginated<AppUser>>('/users', { per_page: 100 }),
      ])
      setAudits(auditsRes.data)
      setSpecs(specsRes.data)
      setLabs(labsRes.data)
      setUsers(usersRes.data)
      setError('')
    } catch (caught) {
      setError(firstError(caught))
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
  }, [load])

  // Count audits per spec and detect labs
  const specAuditStats = useMemo(() => {
    const counts = new Map<number, { count: number; labs: Set<string> }>()
    for (const s of specs) {
      counts.set(s.id, { count: 0, labs: new Set() })
    }
    for (const a of audits) {
      const entry = counts.get(a.master_pc_spec_id)
      if (entry) {
        entry.count += 1
        if (a.lab_name) entry.labs.add(a.lab_name.replace(/Laboratorium Komputer\s*/i, 'Lab '))
      }
    }
    return counts
  }, [specs, audits])

  // Min and Max standby specs
  const standbyStats = useMemo(() => {
    if (specs.length === 0) return { min: 0, max: 0, maxSpecLabel: '—' }
    let min = specs[0].standby_watt
    let max = specs[0].standby_watt
    let maxSpec = specs[0]
    for (const s of specs) {
      if (s.standby_watt < min) min = s.standby_watt
      if (s.standby_watt > max) {
        max = s.standby_watt
        maxSpec = s
      }
    }
    return {
      min,
      max,
      maxSpecLabel: `Kapasitas ${maxSpec.ram_gb} GB / ${maxSpec.storage_gb >= 1000 ? `${maxSpec.storage_gb / 1000} TB` : `${maxSpec.storage_gb} GB`}`,
    }
  }, [specs])

  function openCreateSpec() {
    setEditingSpec(null)
    setSpecRam('16')
    setSpecStorage('512')
    setSpecStorageType('NVME')
    setSpecCpu('DDR4/DDR5')
    setSpecWatt('5')
    setSpecError('')
    setSpecModalOpen(true)
  }

  function openEditSpec(spec: Spec) {
    setEditingSpec(spec)
    setSpecRam(String(spec.ram_gb))
    setSpecStorage(String(spec.storage_gb))
    setSpecStorageType((spec.storage_type?.toUpperCase() as 'SSD' | 'HDD' | 'NVME') || 'NVME')
    setSpecCpu(spec.cpu ?? '')
    setSpecWatt(String(spec.standby_watt))
    setSpecError('')
    setSpecModalOpen(true)
  }

  async function handleSaveSpec(event: FormEvent) {
    event.preventDefault()
    setSavingSpec(true)
    setSpecError('')
    try {
      const payload = {
        ram_gb: Number(specRam),
        storage_gb: Number(specStorage),
        storage_type: specStorageType,
        cpu: specCpu.trim() || null,
        standby_watt: Number(specWatt),
        is_active: true,
      }
      if (editingSpec) {
        await api.patch(`/specs/${editingSpec.id}`, payload)
        toast.success(`Spesifikasi ${specRam}GB RAM / ${specStorage}GB berhasil diperbarui!`)
      } else {
        await api.post('/specs', payload)
        toast.success('Spesifikasi baru berhasil ditambahkan ke katalog master!')
      }
      setSpecModalOpen(false)
      await load(true)
    } catch (caught) {
      setSpecError(firstError(caught))
    } finally {
      setSavingSpec(false)
    }
  }

  async function handleDeleteSpec(spec: Spec) {
    const stats = specAuditStats.get(spec.id)
    if (stats && stats.count > 0) {
      toast.error(`Tidak dapat menghapus: Spesifikasi sedang digunakan oleh ${stats.count} unit PC di audit.`)
      return
    }
    if (!window.confirm(`Hapus spesifikasi ${spec.ram_gb} GB / ${spec.storage_gb} GB (${spec.standby_watt}W) dari katalog?`)) return
    try {
      await api.delete(`/specs/${spec.id}`)
      toast.success('Spesifikasi berhasil dihapus dari katalog.')
      await load(true)
    } catch (caught) {
      toast.error(firstError(caught))
    }
  }

  function openEditUser(user: AppUser) {
    setEditingUser(user)
    setUserRole(user.role)
    setUserActive(user.is_active)
    setUserError('')
    setUserModalOpen(true)
  }

  async function handleSaveUser(event: FormEvent) {
    event.preventDefault()
    if (!editingUser) return
    setSavingUser(true)
    setUserError('')
    try {
      await api.patch(`/users/${editingUser.id}`, {
        role: userRole,
        is_active: userActive,
      })
      toast.success(`Akun ${editingUser.name} diperbarui!`)
      setUserModalOpen(false)
      await load(true)
    } catch (caught) {
      setUserError(firstError(caught))
    } finally {
      setSavingUser(false)
    }
  }

  if (loading && specs.length === 0) return <PageLoader label="Memuat master data & RBAC..." />
  if (error && specs.length === 0) return <ErrorState message={error} onRetry={() => void load()} />

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── Breadcrumb & Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: '#64748b', marginBottom: '6px' }}>
            KATALOG SISTEM &amp; TATA KELOLA HAK AKSES • ADMIN PANEL FIK
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', margin: '0 0 6px 0' }}>
            Kelola Master Data &amp; RBAC
          </h1>
          <p style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '780px', lineHeight: 1.5, margin: 0 }}>
            Standardisasi nilai disipasi daya standby RAM/SSD untuk audit listrik vampir serta penegakan protokol Role-Based Access Control lintas sivitas FIK UNKLAB.
          </p>
        </div>

        {/* PostgreSQL Node status badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: '#0d131a', border: '1px solid #1e293b', borderRadius: '8px',
          padding: '8px 14px', fontSize: '11px',
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', display: 'inline-block' }} />
          <div>
            <div style={{ fontWeight: 700, color: '#34d399', fontSize: '10px', letterSpacing: '0.06em' }}>
              DATABASE RELASIONAL AKTIF
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#94a3b8' }}>
              PostgreSQL IoT-Node 01
            </div>
          </div>
        </div>
      </div>

      {/* ── 2 Main Tabs ── */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e2229', paddingBottom: '12px' }}>
        <button
          type="button"
          className="pressable"
          onClick={() => setActiveTab('SPECS')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: activeTab === 'SPECS' ? '#1e2430' : '#111418',
            color: activeTab === 'SPECS' ? '#ffffff' : '#64748b',
            border: `1px solid ${activeTab === 'SPECS' ? '#334155' : '#1e2229'}`,
            borderRadius: '10px', padding: '10px 18px', fontSize: '12.5px', fontWeight: 700,
            cursor: 'pointer',
            transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 160ms var(--ease-out)',
          }}
        >
          <Cpu size={15} style={{ color: activeTab === 'SPECS' ? '#38bdf8' : '#64748b' }} />
          <span>Master Data Perangkat</span>
          <span style={{
            background: activeTab === 'SPECS' ? '#0f172a' : '#181b20',
            border: '1px solid #334155', borderRadius: '12px',
            padding: '2px 8px', fontSize: '10px', color: '#94a3b8',
          }}>
            {specs.length} Katalog
          </span>
        </button>

        <button
          type="button"
          className="pressable"
          onClick={() => setActiveTab('RBAC')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: activeTab === 'RBAC' ? '#1e2430' : '#111418',
            color: activeTab === 'RBAC' ? '#ffffff' : '#64748b',
            border: `1px solid ${activeTab === 'RBAC' ? '#334155' : '#1e2229'}`,
            borderRadius: '10px', padding: '10px 18px', fontSize: '12.5px', fontWeight: 700,
            cursor: 'pointer',
            transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 160ms var(--ease-out)',
          }}
        >
          <Users size={15} style={{ color: activeTab === 'RBAC' ? '#4ade80' : '#64748b' }} />
          <span>User &amp; Hak Akses (RBAC)</span>
          <span style={{
            background: activeTab === 'RBAC' ? '#0f172a' : '#181b20',
            border: '1px solid #334155', borderRadius: '12px',
            padding: '2px 8px', fontSize: '10px', color: '#94a3b8',
          }}>
            {users.length} User
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: MASTER DATA PERANGKAT
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'SPECS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Info Banner Box */}
          <div style={{
            background: '#13161c', border: '1px solid #1e2430', borderRadius: '12px',
            padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: '16px',
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', maxWidth: '820px' }}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: '#1e293b', color: '#38bdf8', display: 'grid',
                placeItems: 'center', fontSize: '13px', flexShrink: 0, marginTop: '2px',
              }}>
                ⓘ
              </div>
              <div>
                <strong style={{ fontSize: '13px', color: '#ffffff', display: 'block', marginBottom: '3px' }}>
                  Katalog Referensi Standby Audit
                </strong>
                <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                  Data ini menjadi pilihan dropdown RAM &amp; SSD pada form <strong style={{ color: '#4ade80' }}>Fast-Input Audit</strong>. Disipasi watt standby digunakan mesin kalkulasi untuk menghitung rugi daya parasitik (vampire load) otomatis saat PC berstatus off/sleep.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreateSpec}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#93c5fd', color: '#0f172a', border: 'none',
                borderRadius: '8px', padding: '9px 18px', fontSize: '12px',
                fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em',
                transition: 'opacity 0.15s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <Plus size={14} strokeWidth={3} />
              + TAMBAH SPESIFIKASI
            </button>
          </div>

          {/* 4 Stat Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            
            {/* 1: Total Spesifikasi */}
            <div style={{ background: '#13161c', border: '1px solid #1e2430', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748b' }}>
                  TOTAL SPESIFIKASI
                </span>
                <Layers size={14} color="#64748b" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
                <span style={{ fontSize: '30px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                  {specs.length}
                </span>
                <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>konfigurasi</span>
              </div>
              <div style={{ fontSize: '10.5px', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>✓</span> Terverifikasi Lab FIK
              </div>
            </div>

            {/* 2: PC Terdokumentasi */}
            <div style={{ background: '#13161c', border: '1px solid #1e2430', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748b' }}>
                  PC TERDOKUMENTASI
                </span>
                <Monitor size={14} color="#64748b" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
                <span style={{ fontSize: '30px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                  {audits.length}
                </span>
                <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>unit workstation</span>
              </div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                Tersebar di {labs.length} Ruang Lab
              </div>
            </div>

            {/* 3: Standby Terendah */}
            <div style={{ background: '#13161c', border: '1px solid #1e2430', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748b' }}>
                  STANDBY TERENDAH
                </span>
                <Zap size={14} color="#34d399" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
                <span style={{ fontSize: '30px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                  {number(standbyStats.min, 1)}
                </span>
                <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>Watt / unit</span>
              </div>
              <div style={{ fontSize: '10.5px', color: '#34d399', fontWeight: 600 }}>
                Tier Hemat Energi
              </div>
            </div>

            {/* 4: Standby Tertinggi */}
            <div style={{ background: '#13161c', border: '1px solid #1e2430', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748b' }}>
                  STANDBY TERTINGGI
                </span>
                <AlertTriangle size={14} color="#f97316" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
                <span style={{ fontSize: '30px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#f97316' }}>
                  {number(standbyStats.max, 1)}
                </span>
                <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>Watt / unit</span>
              </div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                {standbyStats.maxSpecLabel}
              </div>
            </div>
          </div>

          {/* Table: Katalog Spesifikasi RAM, SSD & Standby Watt */}
          <div style={{ background: '#13161c', border: '1px solid #1e2430', borderRadius: '12px', overflow: 'hidden' }}>
            
            {/* Table Header Row */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', borderBottom: '1px solid #1e2430',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#38bdf8', fontSize: '14px' }}>☰</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff' }}>
                  Katalog Spesifikasi RAM, SSD &amp; Standby Watt
                </span>
              </div>
              <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                Standar Pengujian: IEC 62301
              </span>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e2430', color: '#64748b', fontSize: '10px', letterSpacing: '0.06em' }}>
                    <th style={{ padding: '12px 20px', width: '50px' }}>NO</th>
                    <th style={{ padding: '12px 16px' }}>KAPASITAS RAM</th>
                    <th style={{ padding: '12px 16px' }}>KAPASITAS SSD</th>
                    <th style={{ padding: '12px 16px' }}>WATT STANDBY (VAMPIRE)</th>
                    <th style={{ padding: '12px 16px' }}>DIPAKAI DI AUDIT</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {specs.map((spec, index) => {
                    const stats = specAuditStats.get(spec.id)
                    const count = stats?.count ?? 0
                    const labsArray = Array.from(stats?.labs ?? [])
                    const labText = count > 0
                      ? `(${labsArray.slice(0, 3).join(', ')}${labsArray.length > 3 ? '...' : ''})`
                      : '(Belum terpakai)'
                    
                    const isOrange = spec.standby_watt > 5
                    
                    return (
                      <tr
                        key={spec.id}
                        style={{
                          borderBottom: '1px solid #191d24',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#181c24')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                            <strong style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                              {spec.ram_gb} GB
                            </strong>
                            <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                              {spec.cpu || 'DDR4'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                          {spec.storage_gb >= 1000 ? `${spec.storage_gb} GB (${spec.storage_gb / 1000} TB)` : `${spec.storage_gb} GB`} {spec.storage_type === 'NVME' ? 'NVMe' : spec.storage_type}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: isOrange ? '#451a03' : '#064e3b',
                            border: `1px solid ${isOrange ? '#f97316' : '#10b981'}`,
                            borderRadius: '6px', padding: '3px 8px',
                            fontSize: '11px', fontWeight: 800, fontFamily: 'var(--font-mono)',
                            color: isOrange ? '#fdba74' : '#6ee7b7',
                          }}>
                            ⚡ {number(spec.standby_watt, 0)} W
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontWeight: 700,
                            color: count > 0 ? '#ffffff' : '#64748b',
                          }}>
                            {count} PC
                          </span>
                          <span style={{ marginLeft: '6px', fontSize: '11px', color: '#64748b' }}>
                            {labText}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '12px' }}>
                            <button
                              type="button"
                              onClick={() => openEditSpec(spec)}
                              style={{
                                background: 'none', border: 'none', color: '#94a3b8',
                                fontSize: '11.5px', fontWeight: 600, cursor: 'pointer',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.color = '#38bdf8')}
                              onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
                            >
                              Ubah
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteSpec(spec)}
                              style={{
                                background: 'none', border: 'none', color: '#f87171',
                                fontSize: '11.5px', fontWeight: 600, cursor: 'pointer',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.color = '#ef4444')}
                              onMouseOut={(e) => (e.currentTarget.style.color = '#f87171')}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Banner */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 20px', borderTop: '1px solid #1e2430', background: '#0e1014',
              fontSize: '11px', color: '#64748b', flexWrap: 'wrap', gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                <span style={{ color: '#10b981' }}>✓</span>
                Form audit secara otomatis mengalikan Watt Standby × jam non-aktif lab × tarif PLN Rp 1.444/kWh.
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', color: '#475569' }}>
                Skema Entri Terisolasi (No MAC / No IP)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: USER & HAK AKSES (RBAC)
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'RBAC' && (
        <div style={{ background: '#13161c', border: '1px solid #1e2430', borderRadius: '12px', overflow: 'hidden' }}>
          
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 20px', borderBottom: '1px solid #1e2430',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="#38bdf8" />
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff' }}>
                Daftar Akun Sivitas &amp; Penetapan Wewenang RBAC
              </span>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'none', border: 'none', color: '#38bdf8', fontSize: '11.5px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} className={refreshing ? 'spin' : ''} /> Muat Ulang
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e2430', color: '#64748b', fontSize: '10px', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '12px 20px' }}>NAMA PENGGUNA</th>
                  <th style={{ padding: '12px 16px' }}>EMAIL INSTITUSI</th>
                  <th style={{ padding: '12px 16px' }}>ROLE SISTEM</th>
                  <th style={{ padding: '12px 16px' }}>STATUS AKUN</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const roleColor = u.role === 'ADMIN' ? '#4ade80' : u.role === 'AUDITOR' ? '#38bdf8' : u.role === 'MAINTENANCE' ? '#fbbf24' : '#c084fc'
                  return (
                    <tr
                      key={u.id}
                      style={{ borderBottom: '1px solid #191d24' }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#181c24')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 20px', color: '#ffffff', fontWeight: 700 }}>
                        {u.name}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          background: `${roleColor}15`,
                          border: `1px solid ${roleColor}40`,
                          color: roleColor,
                          borderRadius: '6px', padding: '3px 8px', fontSize: '10.5px', fontWeight: 700,
                        }}>
                          {u.role_label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          color: u.is_active ? '#4ade80' : '#64748b', fontSize: '11px', fontWeight: 600,
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: u.is_active ? '#4ade80' : '#64748b' }} />
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => openEditUser(u)}
                          style={{
                            background: '#1e2430', border: '1px solid #334155', color: '#cbd5e1',
                            borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer',
                          }}
                        >
                          Ubah Akses
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal Spec Form ── */}
      <Modal open={specModalOpen} onClose={() => setSpecModalOpen(false)} title={editingSpec ? 'Ubah Spesifikasi Hardware' : 'Tambah Spesifikasi Hardware Master'}>
        <form onSubmit={handleSaveSpec} className="form-stack">
          <div className="field">
            <label htmlFor="specRam">Kapasitas RAM (GB) *</label>
            <input
              id="specRam"
              type="number"
              min="1"
              max="1024"
              className="input"
              value={specRam}
              onChange={(e) => setSpecRam(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="specCpu">Tipe RAM / Deskripsi CPU</label>
            <input
              id="specCpu"
              className="input"
              placeholder="contoh: DDR4 atau DDR5 ECC"
              value={specCpu}
              onChange={(e) => setSpecCpu(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="specStorage">Kapasitas Storage SSD (GB) *</label>
            <input
              id="specStorage"
              type="number"
              min="1"
              max="100000"
              className="input"
              value={specStorage}
              onChange={(e) => setSpecStorage(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="specType">Tipe Storage</label>
            <select
              id="specType"
              className="input"
              value={specStorageType}
              onChange={(e) => setSpecStorageType(e.target.value as 'SSD' | 'HDD' | 'NVME')}
            >
              <option value="NVME">NVMe</option>
              <option value="SSD">SATA SSD</option>
              <option value="HDD">HDD</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="specWatt">Daya Standby Master (Watt) *</label>
            <input
              id="specWatt"
              type="number"
              min="0.1"
              step="0.1"
              className="input"
              value={specWatt}
              onChange={(e) => setSpecWatt(e.target.value)}
              required
            />
          </div>
          {specError && <div className="inline-error" role="alert" aria-live="polite">{specError}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setSpecModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingSpec}>
              {savingSpec ? 'Menyimpan...' : 'Simpan Spesifikasi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal User RBAC ── */}
      <Modal open={userModalOpen} onClose={() => setUserModalOpen(false)} title={`Kelola Akses: ${editingUser?.name}`}>
        <form onSubmit={handleSaveUser} className="form-stack">
          <div className="field">
            <label htmlFor="userRoleSelect">Role Wewenang</label>
            <select
              id="userRoleSelect"
              className="input"
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as Role)}
            >
              <option value="ADMIN">Dosen PJ / Admin FIK (ADMIN)</option>
              <option value="AUDITOR">Auditor Lapangan FIK (AUDITOR)</option>
              <option value="MAINTENANCE">Facility Maintenance (MAINTENANCE)</option>
              <option value="PIMPINAN">Pimpinan Kampus / Dekan (PIMPINAN)</option>
            </select>
          </div>
          <label className="checklist-item" style={{ marginTop: '8px' }}>
            <input
              type="checkbox"
              checked={userActive}
              onChange={(e) => setUserActive(e.target.checked)}
              style={{ accentColor: '#10b981' }}
            />
            <span>Status Akun Aktif</span>
          </label>
          {userError && <div className="inline-error" role="alert" aria-live="polite">{userError}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setUserModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingUser}>
              {savingUser ? 'Menyimpan...' : 'Perbarui Akun'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

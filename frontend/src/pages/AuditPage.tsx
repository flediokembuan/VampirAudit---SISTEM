import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Monitor,
  Power,
  Wrench,
  Zap,
} from 'lucide-react'
import { api, firstError } from '../lib/api'
import { number, relativeTime, rupiah } from '../lib/format'
import { ErrorState, PageLoader, ProgressBar } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import type { AuditLog, Paginated, PanelOverview, Parameters, ProgressLab, Spec } from '../types'

type UnitCondition = 'OFF' | 'NORMAL' | 'ANOMALY'
type PcStatus = 'off' | 'normal' | 'standby' | 'anomaly' | 'unverified'

function pcCodeFromNumber(num: number): string {
  return `PC-${String(num).padStart(2, '0')}`
}

export default function AuditPage() {
  const toast = useToast()
  const [progressLabs, setProgressLabs] = useState<ProgressLab[]>([])
  const [specs, setSpecs] = useState<Spec[]>([])
  const [panelOverview, setPanelOverview] = useState<(PanelOverview & { parameters?: Parameters }) | null>(null)
  const [labAudits, setLabAudits] = useState<AuditLog[]>([])
  const [selectedLabId, setSelectedLabId] = useState<number>(1)
  const [selectedPc, setSelectedPc] = useState<number>(29)
  const selectedPcRef = useRef(29)
  const [selectedSpecId, setSelectedSpecId] = useState<number>(1)
  const [gridFilter, setGridFilter] = useState<'ALL' | 'UNVERIFIED' | 'PROBLEM'>('ALL')
  const [condition, setCondition] = useState<UnitCondition>('OFF')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [reportingOutlet, setReportingOutlet] = useState(false)

  const [checkKabel, setCheckKabel] = useState(false)
  const [checkStopkontak, setCheckStopkontak] = useState(false)
  const [checkPsu, setCheckPsu] = useState(false)
  const [checkShutdown, setCheckShutdown] = useState(false)
  const [auditNote, setAuditNote] = useState('')

  const loadLabData = useCallback(async (labId: number) => {
    const [progressRes, specsRes, panelsRes, auditsRes] = await Promise.all([
      api.get<{ data: ProgressLab[] }>('/audits/progress'),
      api.get<{ data: Spec[] }>('/specs'),
      api.get<PanelOverview & { parameters?: Parameters }>('/panel-limits'),
      api.get<Paginated<AuditLog>>('/audits', { lab_room_id: labId, per_page: 100 }),
    ])
    setProgressLabs(progressRes.data)
    setSpecs(specsRes.data)
    setPanelOverview(panelsRes)
    setLabAudits(auditsRes.data)
    return { progress: progressRes.data, specs: specsRes.data, audits: auditsRes.data }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    void loadLabData(selectedLabId)
      .then((res) => {
        if (!active) return
        if (res.progress.length > 0 && !res.progress.some((l) => l.id === selectedLabId)) {
          setSelectedLabId(res.progress[0].id)
          return
        }
        if (res.specs.length > 0) {
          const pcAudit = res.audits.find((a) => a.pc_number === pcCodeFromNumber(selectedPcRef.current))
          if (pcAudit) {
            setSelectedSpecId(pcAudit.master_pc_spec_id)
            setCondition(pcAudit.is_faulty ? 'ANOMALY' : pcAudit.spec.standby_watt === 0 ? 'OFF' : 'NORMAL')
            setAuditNote(pcAudit.fault_note ?? '')
          } else {
            setSelectedSpecId(res.specs[0].id)
          }
        }
        setError('')
      })
      .catch((caught) => {
        if (active) setError(firstError(caught))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [loadLabData, selectedLabId])

  const currentLab = useMemo(
    () => progressLabs.find((l) => l.id === selectedLabId) ?? progressLabs[0] ?? null,
    [progressLabs, selectedLabId],
  )

  const capacity = currentLab?.capacity ?? 40

  const auditMap = useMemo(() => {
    const map = new Map<string, AuditLog>()
    for (const item of labAudits) {
      map.set(item.pc_number.toUpperCase(), item)
    }
    return map
  }, [labAudits])

  const getPcStatus = useCallback(
    (num: number): PcStatus => {
      const audit = auditMap.get(pcCodeFromNumber(num))
      if (!audit) return 'unverified'
      if (audit.is_faulty) return 'anomaly'
      if (audit.spec.standby_watt === 0) return 'off'
      if (audit.spec.standby_watt > 5) return 'standby'
      return 'normal'
    },
    [auditMap],
  )

  const allPcs = useMemo(() => Array.from({ length: capacity }, (_, i) => i + 1), [capacity])

  const pcStats = useMemo(() => {
    let off = 0
    let normalOrStandby = 0
    let anomaly = 0
    let unverified = 0
    for (const num of allPcs) {
      const st = getPcStatus(num)
      if (st === 'off') off += 1
      else if (st === 'anomaly') anomaly += 1
      else if (st === 'unverified') unverified += 1
      else normalOrStandby += 1
    }
    return { off, normalOrStandby, anomaly, unverified }
  }, [allPcs, getPcStatus])

  const filteredPcs = useMemo(() => {
    return allPcs.filter((num) => {
      const st = getPcStatus(num)
      if (gridFilter === 'UNVERIFIED') return st === 'unverified'
      if (gridFilter === 'PROBLEM') return st === 'anomaly' || st === 'standby'
      return true
    })
  }, [allPcs, getPcStatus, gridFilter])

  const selectedSpec = useMemo(
    () => specs.find((s) => s.id === selectedSpecId) ?? specs[0] ?? null,
    [specs, selectedSpecId],
  )

  const selectedAudit = auditMap.get(pcCodeFromNumber(selectedPc)) ?? null

  const applyPcState = useCallback(
    (pcNum: number, auditsSource: AuditLog[] = labAudits) => {
      selectedPcRef.current = pcNum
      setSelectedPc(pcNum)
      const found = auditsSource.find((a) => a.pc_number.toUpperCase() === pcCodeFromNumber(pcNum))
      if (found) {
        setSelectedSpecId(found.master_pc_spec_id)
        setCondition(found.is_faulty ? 'ANOMALY' : found.spec.standby_watt === 0 ? 'OFF' : 'NORMAL')
        setAuditNote(found.fault_note ?? '')
        setCheckKabel(Boolean(found.is_faulty && found.fault_note?.toLowerCase().includes('kabel')))
        setCheckStopkontak(Boolean(found.is_faulty && found.fault_note?.toLowerCase().includes('stopkontak')))
        setCheckPsu(Boolean(found.is_faulty && found.fault_note?.toLowerCase().includes('psu')))
        setCheckShutdown(Boolean(found.is_faulty && found.fault_note?.toLowerCase().includes('shutdown')))
      } else {
        if (specs.length > 0) setSelectedSpecId(specs[0].id)
        setCondition('OFF')
        setAuditNote('')
        setCheckKabel(false)
        setCheckStopkontak(false)
        setCheckPsu(false)
        setCheckShutdown(false)
      }
    },
    [labAudits, specs],
  )

  const labPanelSocket = useMemo(() => {
    const labPanel = panelOverview?.labs.find((l) => l.id === selectedLabId)
    return labPanel?.panels.find((p) => p.group_type === 'SOCKET') ?? null
  }, [panelOverview, selectedLabId])

  const labStandbySummary = useMemo(() => {
    const totalWatt = labAudits.reduce((sum, item) => sum + item.spec.standby_watt, 0)
    const params = panelOverview?.parameters
    const hours = params?.standby_hours_per_day ?? 8
    const days = params?.standby_days_per_month ?? 30
    const tariff = params?.tariff_per_kwh ?? 1444.7
    const monthlyCost = ((totalWatt * hours * days) / 1000) * tariff
    const activeStandbyUnits = labAudits.filter((item) => item.spec.standby_watt > 0).length
    return { totalWatt, monthlyCost, activeStandbyUnits }
  }, [labAudits, panelOverview])

  async function handleSaveNext(event: FormEvent) {
    event.preventDefault()
    if (!selectedSpec) return

    setSaving(true)
    const pcCode = pcCodeFromNumber(selectedPc)
    const checklistTags = [
      checkKabel ? 'Kabel Power Terkelupas' : '',
      checkStopkontak ? 'Stopkontak Meja Longgar/Sparking' : '',
      checkPsu ? 'PSU Suhu Tinggi (>45°C)' : '',
      checkShutdown ? 'Gagal Shutdown Otomatis' : '',
    ].filter(Boolean)

    const combinedNote =
      condition === 'ANOMALY'
        ? [checklistTags.join(', '), auditNote.trim()].filter(Boolean).join(' — ') ||
          'Anomali kelistrikan terdeteksi pada workstation.'
        : null

    const targetWatt =
      condition === 'OFF' ? 0 : condition === 'NORMAL' ? selectedSpec.standby_watt : Math.max(selectedSpec.standby_watt, 14.2)

    try {
      if (selectedAudit) {
        await api.patch(`/audits/${selectedAudit.id}`, {
          pc_number: pcCode,
          master_pc_spec_id: selectedSpec.id,
          standby_watt_snapshot: targetWatt,
          is_faulty: condition === 'ANOMALY',
          fault_note: combinedNote,
        })
      } else {
        await api.post('/audits', {
          lab_room_id: selectedLabId,
          pc_number: pcCode,
          master_pc_spec_id: selectedSpec.id,
          standby_watt_snapshot: targetWatt,
          is_faulty: condition === 'ANOMALY',
          fault_note: combinedNote,
        })
      }

      if (condition === 'ANOMALY') {
        await api.post('/incidents', {
          lab_room_id: selectedLabId,
          description: `${pcCode} — ${combinedNote}`,
        })
        toast.push('info', `Tiket insiden untuk ${pcCode} dikirim ke tim Facility Maintenance.`)
      }

      const refreshed = await loadLabData(selectedLabId)
      toast.success(`Data verifikasi ${pcCode} berhasil disimpan ke database!`)
      const nextPc = Math.min(selectedPc + 1, capacity)
      applyPcState(nextPc, refreshed.audits)
    } catch (caught) {
      toast.error(firstError(caught))
    } finally {
      setSaving(false)
    }
  }

  async function handleReportOutlet() {
    setReportingOutlet(true)
    const pcCode = pcCodeFromNumber(selectedPc)
    try {
      await api.post('/incidents', {
        lab_room_id: selectedLabId,
        description: `Meja ${pcCode} (${currentLab?.name ?? 'Lab'}) ditandai membutuhkan penggantian stopkontak / perbaikan jalur meja.`,
      })
      toast.push('info', `Tiket penggantian stopkontak untuk ${pcCode} telah dikirim!`)
    } catch (caught) {
      toast.error(firstError(caught))
    } finally {
      setReportingOutlet(false)
    }
  }

  if (loading && progressLabs.length === 0) {
    return <PageLoader label="Memuat data workstation laboratorium..." />
  }
  if (error && progressLabs.length === 0) {
    return <ErrorState message={error} onRetry={() => void loadLabData(selectedLabId)} />
  }

  const deskRow = Math.ceil(selectedPc / 8)
  const deskSector = String.fromCharCode(64 + deskRow)
  const recentAudits = labAudits.slice(0, 4)

  return (
    <>
      <div className="page-head" style={{ marginBottom: '16px' }}>
        <div>
          <div className="eyebrow" style={{ color: '#94a3b8' }}>
            AUDIT LAPANGAN &gt; FORM FAST-INPUT WORKSTATION
          </div>
          <h1>Audit Cepat Kelistrikan Meja Laboratorium &amp; Validasi Standby</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <label htmlFor="auditLabSelect" className="visually-hidden">Pilih Ruang Laboratorium</label>
          <select
            id="auditLabSelect"
            name="lab_room_id"
            className="input"
            style={{
              width: '300px',
              height: '38px',
              fontSize: '12.5px',
              fontWeight: 700,
              backgroundColor: '#14161a',
              color: '#ffffff',
            }}
            value={selectedLabId}
            onChange={(e) => {
              selectedPcRef.current = 1
              setSelectedLabId(Number(e.target.value))
              setSelectedPc(1)
            }}
          >
            {progressLabs.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.name} ({lab.capacity} Unit PC)
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="badge-dot" style={{ backgroundColor: '#10b981' }} />
              Terhubung Database Live
            </span>
            <span style={{ color: '#64748b' }}>{currentLab?.location ?? 'Gedung FIK'}</span>
          </div>
        </div>
      </div>

      <div className="audit-summary-strip">
        <div className="audit-summary-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8' }}>
              KEMAJUAN {currentLab?.name.toUpperCase() ?? 'LABORATORIUM'}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#4edea3' }}>
              {currentLab?.audited_count ?? 0} / {capacity} PC Terverifikasi ({number(currentLab?.progress_percent ?? 0, 1)}%)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: '#10b981' }}>● {pcStats.off} Mati (0W)</span>
            <span style={{ color: '#38bdf8' }}>● {pcStats.normalOrStandby} Aktif/Standby</span>
            <span style={{ color: '#f87171' }}>● {pcStats.anomaly} Bermasalah</span>
          </div>
        </div>

        <ProgressBar value={currentLab?.progress_percent ?? 0} tone="accent" height={6} />
      </div>

      <form className="audit-3col-grid" onSubmit={handleSaveNext}>
        <section className="card" style={{ padding: '16px' }}>
          <div className="card-head" style={{ marginBottom: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Monitor size={15} color="#38bdf8" />
                <h2 className="card-title" style={{ fontSize: '13.5px' }}>Denah Grid {capacity} Unit PC</h2>
              </div>
              <p className="card-sub" style={{ fontSize: '10.5px' }}>Matriks Meja Auditor Lapangan</p>
            </div>
            <span className="badge badge-neutral" style={{ fontSize: '10px' }}>Lab-0{selectedLabId}</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
            <button
              type="button"
              className={`btn btn-xs ${gridFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '10px', height: '26px' }}
              onClick={() => setGridFilter('ALL')}
            >
              Semua ({capacity})
            </button>
            <button
              type="button"
              className={`btn btn-xs ${gridFilter === 'UNVERIFIED' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '10px', height: '26px' }}
              onClick={() => setGridFilter('UNVERIFIED')}
            >
              Belum ({pcStats.unverified})
            </button>
            <button
              type="button"
              className={`btn btn-xs ${gridFilter === 'PROBLEM' ? 'btn-danger' : 'btn-secondary'}`}
              style={{ fontSize: '10px', height: '26px' }}
              onClick={() => setGridFilter('PROBLEM')}
            >
              Masalah ({pcStats.anomaly})
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '9px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: '#64748b',
              marginBottom: '4px',
            }}
          >
            <span>SEKTOR MEJA A-E (DEPAN KE BELAKANG)</span>
            <span>KANAL 1-8</span>
          </div>

          <div className="grid-40-container">
            {allPcs.map((pcNum) => {
              const st = getPcStatus(pcNum)
              const isSelected = pcNum === selectedPc
              const isMatch = filteredPcs.includes(pcNum)
              return (
                <button
                  type="button"
                  key={pcNum}
                  className={`pc-grid-cell ${st} ${isSelected ? 'selected' : ''}`}
                  onClick={() => applyPcState(pcNum)}
                  style={{ opacity: isMatch ? 1 : 0.2 }}
                  title={`${pcCodeFromNumber(pcNum)}: ${st.toUpperCase()}`}
                  aria-label={`Pilih ${pcCodeFromNumber(pcNum)} (${st})`}
                >
                  {String(pcNum).padStart(2, '0')}
                </button>
              )
            })}
          </div>

          <div className="grid-legend-row">
            <span style={{ color: '#10b981' }}>● Mati Total (0W)</span>
            <span style={{ color: '#38bdf8' }}>● Normal (&le;5W)</span>
            <span style={{ color: '#fbbf24' }}>● Standby Boros (&gt;5W)</span>
            <span style={{ color: '#f87171' }}>● Anomali / Masalah</span>
          </div>
        </section>

        <section className="card" style={{ padding: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              borderBottom: '1px solid #26292e',
              marginBottom: '16px',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  backgroundColor: condition === 'ANOMALY' ? '#ef4444' : condition === 'NORMAL' ? '#0ea5e9' : '#10b981',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span className="badge-dot" style={{ backgroundColor: '#ffffff' }} />
                {pcCodeFromNumber(selectedPc)}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '15px', color: '#ffffff' }}>
                    Meja Baris {deskRow}, Sektor {deskSector}
                  </h2>
                  {condition === 'ANOMALY' && (
                    <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 700 }}>
                      Anomali Terdeteksi
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                  {selectedAudit ? `Terakhir diaudit ${relativeTime(selectedAudit.audited_at)}` : 'Belum terverifikasi di sesi ini'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-xs btn-secondary"
                onClick={() => applyPcState(Math.max(selectedPc - 1, 1))}
              >
                &lt; {pcCodeFromNumber(Math.max(selectedPc - 1, 1))}
              </button>
              <button
                type="button"
                className="btn btn-xs btn-secondary"
                onClick={() => applyPcState(Math.min(selectedPc + 1, capacity))}
              >
                {pcCodeFromNumber(Math.min(selectedPc + 1, capacity))} &gt;
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: '#14161a', border: '1px solid #26292e', borderRadius: '12px', padding: '14px 16px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#e2e2e6' }}>
                <Cpu size={14} color="#38bdf8" />
                <span>Profil Spesifikasi Hardware Master</span>
              </div>
              <label htmlFor="auditSpecSelect" className="visually-hidden">Pilih Spesifikasi PC</label>
              <select
                id="auditSpecSelect"
                name="master_pc_spec_id"
                className="input input-sm"
                style={{ width: 'auto', maxWidth: '280px', fontSize: '11px' }}
                value={selectedSpecId}
                onChange={(e) => setSelectedSpecId(Number(e.target.value))}
              >
                {specs.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.label} ({spec.standby_watt}W)
                  </option>
                ))}
              </select>
            </div>

            <div className="spec-2x3-grid">
              <div className="spec-cell-tile">
                <div className="label">CPU</div>
                <div className="val">{selectedSpec?.cpu ?? 'Standar Lab'}</div>
              </div>
              <div className="spec-cell-tile">
                <div className="label">RAM</div>
                <div className="val">{selectedSpec ? `${selectedSpec.ram_gb} GB` : '—'}</div>
              </div>
              <div className="spec-cell-tile">
                <div className="label">PENYIMPANAN</div>
                <div className="val">{selectedSpec ? `${selectedSpec.storage_gb} GB ${selectedSpec.storage_type}` : '—'}</div>
              </div>
              <div className="spec-cell-tile">
                <div className="label">STANDBY MASTER</div>
                <div className="val">{selectedSpec ? `${selectedSpec.standby_watt} W` : '—'}</div>
              </div>
              <div className="spec-cell-tile">
                <div className="label">STANDBY TERCATAT</div>
                <div className="val">
                  {condition === 'OFF' ? '0.0 W' : condition === 'NORMAL' ? `${selectedSpec?.standby_watt ?? 0} W` : `${Math.max(selectedSpec?.standby_watt ?? 0, 14.2)} W`}
                </div>
              </div>
              <div className="spec-cell-tile">
                <div className="label">STATUS RECORD</div>
                <div className="val">{selectedAudit ? 'Update Record' : 'Record Baru'}</div>
              </div>
            </div>
          </div>

          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '8px' }}>
              <span>PILIH VALIDASI STATUS FISIK &amp; KELISTRIKAN</span>
              <span style={{ color: '#f97316' }}>WAJIB DIISI</span>
            </legend>

            <div className="audit-trio-row">
              <label className={`audit-trio-card ${condition === 'OFF' ? 'active-green' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <Power size={18} color="#10b981" />
                  <input
                    type="radio"
                    name="unitCondition"
                    value="OFF"
                    checked={condition === 'OFF'}
                    onChange={() => setCondition('OFF')}
                    style={{ accentColor: '#10b981' }}
                  />
                </div>
                <div>
                  <strong style={{ fontSize: '12.5px', color: '#ffffff', display: 'block' }}>Mati Total / Cabut</strong>
                  <small style={{ fontSize: '10.5px', color: '#94a3b8' }}>Stopkontak 0 Watt</small>
                </div>
              </label>

              <label className={`audit-trio-card ${condition === 'NORMAL' ? 'active-blue' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <Monitor size={18} color="#38bdf8" />
                  <input
                    type="radio"
                    name="unitCondition"
                    value="NORMAL"
                    checked={condition === 'NORMAL'}
                    onChange={() => setCondition('NORMAL')}
                    style={{ accentColor: '#38bdf8' }}
                  />
                </div>
                <div>
                  <strong style={{ fontSize: '12.5px', color: '#ffffff', display: 'block' }}>Standby / Normal</strong>
                  <small style={{ fontSize: '10.5px', color: '#94a3b8' }}>{selectedSpec ? `${selectedSpec.standby_watt} W master` : 'Operasional wajar'}</small>
                </div>
              </label>

              <label className={`audit-trio-card ${condition === 'ANOMALY' ? 'active-red' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <AlertTriangle size={18} color="#ef4444" />
                  <input
                    type="radio"
                    name="unitCondition"
                    value="ANOMALY"
                    checked={condition === 'ANOMALY'}
                    onChange={() => setCondition('ANOMALY')}
                    style={{ accentColor: '#ef4444' }}
                  />
                </div>
                <div>
                  <strong style={{ fontSize: '12.5px', color: '#fca5a5', display: 'block' }}>Unit Bermasalah / Anomali</strong>
                  <small style={{ fontSize: '10.5px', color: '#94a3b8' }}>Konsleting, bocor arus</small>
                </div>
              </label>
            </div>
          </fieldset>

          {condition === 'ANOMALY' && (
            <div className="anomaly-form-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wrench size={14} color="#f87171" />
                  <strong style={{ fontSize: '12.5px', color: '#ffffff' }}>
                    Formulir Kendala {pcCodeFromNumber(selectedPc)} &amp; Tiket Otomatis
                  </strong>
                </div>
                <span className="badge badge-danger" style={{ fontSize: '9.5px' }}>P1 Kritis</span>
              </div>

              <div className="checklist-2x2">
                <label className={`checklist-item ${checkKabel ? 'checked' : ''}`}>
                  <input type="checkbox" checked={checkKabel} onChange={(e) => setCheckKabel(e.target.checked)} style={{ accentColor: '#ef4444' }} />
                  <span>Kabel Power Terkelupas / Bahaya Sengatan</span>
                </label>

                <label className={`checklist-item ${checkStopkontak ? 'checked' : ''}`}>
                  <input type="checkbox" checked={checkStopkontak} onChange={(e) => setCheckStopkontak(e.target.checked)} style={{ accentColor: '#ef4444' }} />
                  <span>Stopkontak Meja Longgar / Sparking</span>
                </label>

                <label className={`checklist-item ${checkPsu ? 'checked' : ''}`}>
                  <input type="checkbox" checked={checkPsu} onChange={(e) => setCheckPsu(e.target.checked)} style={{ accentColor: '#ef4444' }} />
                  <span>PSU Suhu Tinggi (&gt;45°C)</span>
                </label>

                <label className={`checklist-item ${checkShutdown ? 'checked' : ''}`}>
                  <input type="checkbox" checked={checkShutdown} onChange={(e) => setCheckShutdown(e.target.checked)} style={{ accentColor: '#ef4444' }} />
                  <span>Komputer Gagal Shutdown Otomatis</span>
                </label>
              </div>

              <div className="field" style={{ marginBottom: '4px' }}>
                <label htmlFor="auditFaultNote" style={{ fontSize: '10.5px' }}>Catatan Rinci Auditor Lapangan:</label>
                <textarea
                  id="auditFaultNote"
                  name="fault_note"
                  className="input textarea"
                  rows={2}
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  placeholder="Jelaskan kondisi kabel, stopkontak, atau PSU yang bermasalah..."
                  style={{ fontSize: '11.5px', lineHeight: 1.45 }}
                />
              </div>
            </div>
          )}
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} color="#10b981" />
                <h3 className="card-title" style={{ fontSize: '13px' }}>Beban Panel {currentLab?.name.split(' ').slice(0, 2).join(' ')}</h3>
              </div>
              <span className={`badge badge-${labPanelSocket?.status === 'WARNING' || labPanelSocket?.status === 'OVER' ? 'danger' : 'success'}`} style={{ fontSize: '9px' }}>
                {labPanelSocket?.status_label ?? 'Normal'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
              <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>MCB 10A Meja Komputer</span>
              <span className="mono" style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                {number(labPanelSocket?.percent ?? 0, 1)}% Kapasitas
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                {number(labPanelSocket?.load_watt ?? 0, 0)} <span style={{ fontSize: '11px', color: '#64748b' }}>Watt</span>
              </span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Maks {number(labPanelSocket?.limit_watt ?? 2200, 0)}W</span>
            </div>
            <ProgressBar
              value={labPanelSocket?.percent ?? 0}
              tone={labPanelSocket?.status === 'WARNING' || labPanelSocket?.status === 'OVER' ? 'danger' : 'accent'}
              height={5}
            />
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div className="eyebrow" style={{ fontSize: '9.5px', color: '#f97316' }}>
              PEMBOROSAN STANDBY LAB
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 0' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                {number(labStandbySummary.totalWatt, 0)} <span style={{ fontSize: '11px', color: '#64748b' }}>Watt</span>
              </span>
              <span className="mono" style={{ fontSize: '11px', color: '#f87171', fontWeight: 600 }}>
                -{rupiah(labStandbySummary.monthlyCost)} / bln
              </span>
            </div>
            <p style={{ fontSize: '10.5px', color: '#94a3b8', lineHeight: 1.4 }}>
              Proyeksi dari {labStandbySummary.activeStandbyUnits} unit PC dengan konsumsi standby &gt; 0W di lab ini.
            </p>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} color="#94a3b8" />
                <h3 className="card-title" style={{ fontSize: '12.5px' }}>RIWAYAT {recentAudits.length} PC TERAKHIR</h3>
              </div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Database</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentAudits.map((item) => (
                <div className="recent-audit-item" key={item.id}>
                  <span className="mono" style={{ fontWeight: 700, color: item.is_faulty ? '#f87171' : '#ffffff' }}>
                    {item.pc_number}
                  </span>
                  <div style={{ fontSize: '10.5px', textAlign: 'right' }}>
                    <div>
                      {item.is_faulty
                        ? `Anomali (${item.spec.standby_watt}W)`
                        : item.spec.standby_watt === 0
                          ? 'Mati Total (0W)'
                          : `Standby (${item.spec.standby_watt}W)`}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '9.5px' }}>
                      {relativeTime(item.audited_at)} • {item.auditor?.name ?? 'Auditor'}
                    </div>
                  </div>
                  {item.is_faulty ? (
                    <AlertTriangle size={14} color="#ef4444" />
                  ) : item.spec.standby_watt > 5 ? (
                    <AlertTriangle size={14} color="#f59e0b" />
                  ) : (
                    <CheckCircle2 size={14} color="#10b981" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <button
              type="submit"
              className="login-submit-btn"
              disabled={saving}
              style={{ height: '42px', fontSize: '12.5px' }}
            >
              <ArrowRight size={16} />
              <span>
                {saving
                  ? 'Menyimpan...'
                  : `Simpan ${pcCodeFromNumber(selectedPc)} & Lanjut ke ${pcCodeFromNumber(Math.min(selectedPc + 1, capacity))}`}
              </span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-danger"
              style={{ height: '36px', fontSize: '11.5px', fontWeight: 600 }}
              onClick={() => void handleReportOutlet()}
              disabled={reportingOutlet}
            >
              <AlertTriangle size={13} />
              {reportingOutlet ? 'Mengirim Tiket...' : 'Tandai Meja Perlu Penggantian Stopkontak'}
            </button>

            <button
              type="button"
              style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', background: 'none', padding: '4px' }}
              onClick={() => {
                const next = Math.min(selectedPc + 1, capacity)
                applyPcState(next)
                toast.push('info', `${pcCodeFromNumber(selectedPc)} dilewati sementara.`)
              }}
            >
              Lewati Sementara (Audit Nanti)
            </button>
          </div>
        </div>
      </form>
    </>
  )
}

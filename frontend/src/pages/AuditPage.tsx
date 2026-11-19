import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { api, firstError } from '../lib/api'
import { number } from '../lib/format'
import { ErrorState, PageLoader, ProgressBar } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import type { AuditLog, Paginated, PanelOverview, Parameters, ProgressLab, Spec } from '../types'

type UnitCondition = 'OFF' | 'NORMAL' | 'ANOMALY'
type PcStatus = 'off' | 'normal' | 'standby' | 'anomaly' | 'unverified'

function pcCodeFromNumber(num: number): string {
  return `PC-${String(num).padStart(2, '0')}`
}

function formatTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  } catch {
    return '--:--:--'
  }
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
  const [gridFilter] = useState<'ALL' | 'UNVERIFIED' | 'PROBLEM'>('ALL')
  const [condition, setCondition] = useState<UnitCondition>('OFF')
  const [isFaulty, setIsFaulty] = useState(false)
  const [ramGb, setRamGb] = useState<number | null>(null)
  const [storageGb, setStorageGb] = useState<number | null>(null)
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
            setIsFaulty(pcAudit.is_faulty)
            setRamGb(pcAudit.spec.ram_gb)
            setStorageGb(pcAudit.spec.storage_gb)
            setAuditNote(pcAudit.fault_note ?? '')
          } else {
            setSelectedSpecId(res.specs[0].id)
            setRamGb(res.specs[0]?.ram_gb ?? null)
            setStorageGb(res.specs[0]?.storage_gb ?? null)
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

  // Unique RAM and SSD values derived from specs
  const uniqueRamValues = useMemo(() => {
    const vals = Array.from(new Set(specs.map((s) => s.ram_gb))).sort((a, b) => a - b)
    return vals
  }, [specs])

  const uniqueStorageValues = useMemo(() => {
    const vals = Array.from(new Set(specs.map((s) => s.storage_gb))).sort((a, b) => a - b)
    return vals
  }, [specs])

  const applyPcState = useCallback(
    (pcNum: number, auditsSource: AuditLog[] = labAudits) => {
      selectedPcRef.current = pcNum
      setSelectedPc(pcNum)
      const found = auditsSource.find((a) => a.pc_number.toUpperCase() === pcCodeFromNumber(pcNum))
      if (found) {
        setSelectedSpecId(found.master_pc_spec_id)
        setCondition(found.is_faulty ? 'ANOMALY' : found.spec.standby_watt === 0 ? 'OFF' : 'NORMAL')
        setIsFaulty(found.is_faulty)
        setRamGb(found.spec.ram_gb)
        setStorageGb(found.spec.storage_gb)
        setAuditNote(found.fault_note ?? '')
        setCheckKabel(Boolean(found.is_faulty && found.fault_note?.toLowerCase().includes('kabel')))
        setCheckStopkontak(Boolean(found.is_faulty && found.fault_note?.toLowerCase().includes('stopkontak')))
        setCheckPsu(Boolean(found.is_faulty && found.fault_note?.toLowerCase().includes('psu')))
        setCheckShutdown(Boolean(found.is_faulty && found.fault_note?.toLowerCase().includes('shutdown')))
      } else {
        if (specs.length > 0) {
          setSelectedSpecId(specs[0].id)
          setRamGb(specs[0].ram_gb)
          setStorageGb(specs[0].storage_gb)
        }
        setCondition('OFF')
        setIsFaulty(false)
        setAuditNote('')
        setCheckKabel(false)
        setCheckStopkontak(false)
        setCheckPsu(false)
        setCheckShutdown(false)
      }
    },
    [labAudits, specs],
  )

  // Find best matching spec from selected ram+storage
  const matchedSpec = useMemo(() => {
    if (ramGb === null || storageGb === null) return selectedSpec
    const match = specs.find((s) => s.ram_gb === ramGb && s.storage_gb === storageGb)
    return match ?? selectedSpec
  }, [specs, ramGb, storageGb, selectedSpec])

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    const spec = matchedSpec ?? selectedSpec
    if (!spec) return

    setSaving(true)
    const pcCode = pcCodeFromNumber(selectedPc)
    const isAnomalyNow = isFaulty
    const checklistTags = [
      checkKabel ? 'Kabel Power Terkelupas' : '',
      checkStopkontak ? 'Stopkontak Meja Longgar/Sparking' : '',
      checkPsu ? 'PSU Suhu Tinggi (>45°C)' : '',
      checkShutdown ? 'Gagal Shutdown Otomatis' : '',
    ].filter(Boolean)

    const combinedNote = isAnomalyNow
      ? [checklistTags.join(', '), auditNote.trim()].filter(Boolean).join(' — ') ||
        'Anomali kelistrikan terdeteksi pada workstation.'
      : null

    // Determine condition from isFaulty toggle
    const effectiveCondition: UnitCondition = isAnomalyNow ? 'ANOMALY' : condition === 'ANOMALY' ? 'NORMAL' : condition

    const targetWatt =
      effectiveCondition === 'OFF'
        ? 0
        : effectiveCondition === 'NORMAL'
          ? spec.standby_watt
          : Math.max(spec.standby_watt, 14.2)

    try {
      if (selectedAudit) {
        await api.patch(`/audits/${selectedAudit.id}`, {
          pc_number: pcCode,
          master_pc_spec_id: spec.id,
          standby_watt_snapshot: targetWatt,
          is_faulty: isAnomalyNow,
          fault_note: combinedNote,
        })
      } else {
        await api.post('/audits', {
          lab_room_id: selectedLabId,
          pc_number: pcCode,
          master_pc_spec_id: spec.id,
          standby_watt_snapshot: targetWatt,
          is_faulty: isAnomalyNow,
          fault_note: combinedNote,
        })
      }

      if (isAnomalyNow) {
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

  // Keep handleSaveNext for backward compat (alias)
  const handleSaveNext = handleSave

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

  const savedCount = allPcs.filter((n) => {
    const st = getPcStatus(n)
    return st === 'normal' || st === 'off' || st === 'standby'
  }).length
  const faultyCount = pcStats.anomaly
  const remainCount = pcStats.unverified
  const doneCount = savedCount + faultyCount
  const progressPercent = capacity > 0 ? Math.round((doneCount / capacity) * 100) : 0

  const recentAudits = [...labAudits].sort((a, b) => new Date(b.audited_at).getTime() - new Date(a.audited_at).getTime()).slice(0, 5)

  // PC grid status colors
  function getCellStyle(pcNum: number, isActive: boolean): React.CSSProperties {
    if (isActive) {
      return { background: '#0369a1', border: '2px solid #38bdf8', color: '#ffffff' }
    }
    const st = getPcStatus(pcNum)
    if (st === 'anomaly') return { background: '#7f1d1d', border: '1px solid #ef4444', color: '#fca5a5' }
    if (st === 'normal' || st === 'off' || st === 'standby') return { background: '#14532d', border: '1px solid #22c55e', color: '#86efac' }
    return { background: '#1e2129', border: '1px solid #374151', color: '#6b7280' }
  }

  function getCellSpecText(pcNum: number): string {
    const audit = auditMap.get(pcCodeFromNumber(pcNum))
    if (!audit) return '—'
    if (audit.is_faulty) return 'RUSAK'
    return `${audit.spec.ram_gb}|${audit.spec.storage_gb}`
  }

  const pcCode = pcCodeFromNumber(selectedPc)
  const labName = currentLab?.name ?? 'Lab 2'
  const labLocation = currentLab?.location ?? 'FIK Building Lt. 2'

  return (
    <div style={{ display: 'flex', gap: '16px', minHeight: 'calc(100vh - 80px)', padding: '16px' }}>

      {/* ========== PANEL KIRI ========== */}
      <div style={{ width: '320px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Top badges */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: '#052e16', border: '1px solid #16a34a', borderRadius: '20px',
            padding: '4px 10px', fontSize: '10px', fontWeight: 700, color: '#4ade80', letterSpacing: '0.05em'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            GREEN CAMPUS UNKLAB
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: '#1a1f2e', border: '1px solid #3b82f6', borderRadius: '20px',
            padding: '4px 10px', fontSize: '10px', fontWeight: 700, color: '#93c5fd', letterSpacing: '0.05em'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
            Sesi Auditor Aktif
          </span>
        </div>

        {/* Lab selector card */}
        <div style={{ background: '#14161a', border: '1px solid #26292e', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748b', marginBottom: '8px' }}>
            LOKASI PENGUJIAN LAB
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedLabId}
              onChange={(e) => {
                selectedPcRef.current = 1
                setSelectedLabId(Number(e.target.value))
                setSelectedPc(1)
              }}
              style={{
                width: '100%', background: '#0d0f12', border: '1px solid #374151',
                borderRadius: '8px', padding: '8px 32px 8px 10px', fontSize: '12.5px',
                fontWeight: 700, color: '#ffffff', appearance: 'none', cursor: 'pointer',
              }}
            >
              {progressLabs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.name} ({lab.capacity} Unit PC)
                </option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none', fontSize: '12px' }}>▾</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px' }}>
            <span style={{ color: '#94a3b8' }}>Hari Audit <strong style={{ color: '#ffffff' }}>#3</strong></span>
            <span style={{ color: '#94a3b8' }}>{labLocation}</span>
          </div>
        </div>

        {/* Workstation terpilih */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ background: '#14161a', border: '1px solid #26292e', borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748b', marginBottom: '8px' }}>
              WORKSTATION TERPILIH
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{
                fontSize: '36px', fontWeight: 900, fontFamily: 'var(--font-mono)',
                color: isFaulty ? '#f87171' : '#38bdf8',
                lineHeight: 1,
              }}>
                {pcCode}
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: isFaulty ? '#450a0a' : '#042f2e',
                border: `1px solid ${isFaulty ? '#ef4444' : '#0d9488'}`,
                borderRadius: '20px', padding: '4px 10px',
                fontSize: '10px', fontWeight: 700,
                color: isFaulty ? '#fca5a5' : '#2dd4bf',
                letterSpacing: '0.05em',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isFaulty ? '#ef4444' : '#14b8a6', display: 'inline-block' }} />
                {isFaulty ? 'RUSAK' : 'SIAP DIAUDIT'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => applyPcState(Math.max(selectedPc - 1, 1))}
                style={{ flex: 1, background: '#1e2129', border: '1px solid #374151', borderRadius: '6px', padding: '5px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}
              >
                ← {pcCodeFromNumber(Math.max(selectedPc - 1, 1))}
              </button>
              <button
                type="button"
                onClick={() => applyPcState(Math.min(selectedPc + 1, capacity))}
                style={{ flex: 1, background: '#1e2129', border: '1px solid #374151', borderRadius: '6px', padding: '5px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}
              >
                {pcCodeFromNumber(Math.min(selectedPc + 1, capacity))} →
              </button>
            </div>

            <div style={{ height: '1px', background: '#26292e', margin: '10px 0' }} />

            {/* RAM Dropdown */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', marginBottom: '5px' }}>
                Kapasitas RAM (GB) <span style={{ color: isFaulty ? '#64748b' : '#f97316' }}>{isFaulty ? '(opsional)' : '*'}</span>
              </label>
              <select
                value={ramGb ?? ''}
                onChange={(e) => setRamGb(e.target.value ? Number(e.target.value) : null)}
                required={!isFaulty}
                style={{
                  width: '100%', background: '#0d0f12',
                  border: `1px solid ${!isFaulty && !ramGb ? '#f97316' : '#374151'}`,
                  borderRadius: '8px', padding: '8px 10px', fontSize: '12.5px',
                  color: '#ffffff', appearance: 'none',
                }}
              >
                <option value="">— Pilih RAM —</option>
                {uniqueRamValues.map((v) => (
                  <option key={v} value={v}>{v} GB</option>
                ))}
              </select>
            </div>

            {/* SSD Dropdown */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', marginBottom: '5px' }}>
                Kapasitas SSD (GB) <span style={{ color: isFaulty ? '#64748b' : '#f97316' }}>{isFaulty ? '(opsional)' : '*'}</span>
              </label>
              <select
                value={storageGb ?? ''}
                onChange={(e) => setStorageGb(e.target.value ? Number(e.target.value) : null)}
                required={!isFaulty}
                style={{
                  width: '100%', background: '#0d0f12',
                  border: `1px solid ${!isFaulty && !storageGb ? '#f97316' : '#374151'}`,
                  borderRadius: '8px', padding: '8px 10px', fontSize: '12.5px',
                  color: '#ffffff', appearance: 'none',
                }}
              >
                <option value="">— Pilih SSD —</option>
                {uniqueStorageValues.map((v) => (
                  <option key={v} value={v}>{v} GB</option>
                ))}
              </select>
            </div>

            {/* Toggle: Unit Rusak */}
            <div style={{
              background: isFaulty ? '#450a0a' : '#1a1f2e',
              border: `1px solid ${isFaulty ? '#ef4444' : '#374151'}`,
              borderRadius: '10px', padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: isFaulty ? '#fca5a5' : '#e2e8f0' }}>
                  Unit Mengalami Gangguan/Rusak
                </span>
                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isFaulty
                    setIsFaulty(next)
                    if (next) setCondition('ANOMALY')
                    else setCondition('NORMAL')
                  }}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px',
                    background: isFaulty ? '#ef4444' : '#374151',
                    border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0,
                    transition: 'background-color 200ms ease',
                  }}
                  aria-pressed={isFaulty}
                  aria-label="Toggle unit rusak"
                >
                  <span style={{
                    position: 'absolute', top: '3px',
                    left: '3px',
                    width: '18px', height: '18px',
                    borderRadius: '50%', background: '#ffffff',
                    transform: isFaulty ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 200ms var(--ease-in-out)',
                  }} />
                </button>
              </div>
              <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>
                Jika diaktifkan, unit ditandai Rusak dan dropdown RAM/SSD menjadi opsional.
              </p>
            </div>

            {/* Anomaly sub-form when faulty */}
            {isFaulty && (
              <div className="anomaly-reveal" style={{ marginTop: '10px', background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#fca5a5', marginBottom: '8px' }}>
                  Detail Kerusakan
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                  {[
                    { key: 'kabel', label: 'Kabel Power Terkelupas', checked: checkKabel, setter: setCheckKabel },
                    { key: 'stopkontak', label: 'Stopkontak Longgar/Sparking', checked: checkStopkontak, setter: setCheckStopkontak },
                    { key: 'psu', label: 'PSU Suhu Tinggi (>45°C)', checked: checkPsu, setter: setCheckPsu },
                    { key: 'shutdown', label: 'Gagal Shutdown Otomatis', checked: checkShutdown, setter: setCheckShutdown },
                  ].map(({ key, label, checked, setter }) => (
                    <label key={key} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '10.5px',
                      color: checked ? '#fca5a5' : '#94a3b8', cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox" checked={checked}
                        onChange={(e) => setter(e.target.checked)}
                        style={{ accentColor: '#ef4444', marginTop: '1px' }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <textarea
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  placeholder="Catatan rinci kondisi kerusakan..."
                  rows={2}
                  style={{
                    width: '100%', background: '#0d0f12', border: '1px solid #7f1d1d',
                    borderRadius: '6px', padding: '7px 9px', fontSize: '11px',
                    color: '#ffffff', resize: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>

          {/* Save button */}
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%', background: saving ? '#14532d' : 'linear-gradient(135deg, #15803d, #16a34a)',
              border: 'none', borderRadius: '12px', padding: '14px 16px',
              cursor: saving ? 'not-allowed' : 'pointer', color: '#ffffff',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            }}
          >
            <span style={{ fontSize: '13.5px', fontWeight: 800, letterSpacing: '0.03em' }}>
              {saving ? '⏳ Menyimpan...' : '⬚ Simpan & Lanjut PC Berikutnya →'}
            </span>
            <span style={{ fontSize: '10px', color: '#86efac', fontWeight: 400 }}>
              Tersimpan instan (&lt;1.5s) → otomatis beralih ke unit berikutnya
            </span>
          </button>

          <button
            type="button"
            onClick={() => void handleReportOutlet()}
            disabled={reportingOutlet}
            style={{
              background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: '8px',
              padding: '8px', fontSize: '11px', color: '#fca5a5', cursor: 'pointer',
            }}
          >
            {reportingOutlet ? 'Mengirim Tiket...' : '⚡ Tandai Meja Perlu Penggantian Stopkontak'}
          </button>

          <button
            type="button"
            onClick={() => {
              const next = Math.min(selectedPc + 1, capacity)
              applyPcState(next)
              toast.push('info', `${pcCode} dilewati sementara.`)
            }}
            style={{ background: 'none', border: 'none', fontSize: '10.5px', color: '#475569', cursor: 'pointer', padding: '4px' }}
          >
            Lewati Sementara (Audit Nanti)
          </button>
        </form>
      </div>

      {/* ========== PANEL KANAN ========== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>

        {/* ---- Bagian Atas: Denah PC Grid ---- */}
        <div style={{ background: '#14161a', border: '1px solid #26292e', borderRadius: '12px', padding: '16px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                ⊞ Denah Audit PC {labName} ({capacity} Workstations)
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '10.5px', fontFamily: 'var(--font-mono)', flexWrap: 'wrap' }}>
              <span style={{ color: '#4ade80' }}>● Tersimpan ({savedCount})</span>
              <span style={{ color: '#f87171' }}>● Rusak ({faultyCount})</span>
              <span style={{ color: '#38bdf8' }}>● Aktif ({pcCode})</span>
              <span style={{ color: '#6b7280' }}>Belum ({remainCount})</span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '5px' }}>
              <span style={{ color: '#94a3b8' }}>Target Lab: {capacity} Unit Workstation</span>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>{progressPercent}% Selesai ({doneCount}/{capacity})</span>
            </div>
            <ProgressBar value={progressPercent} tone="accent" height={6} />
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '16px', fontSize: '10.5px', fontFamily: 'var(--font-mono)', marginBottom: '12px' }}>
            <span style={{ color: '#4ade80' }}>● Tersimpan Valid {savedCount}</span>
            <span style={{ color: '#f87171' }}>● Bermasalah/Rusak {faultyCount}</span>
            <span style={{ color: '#6b7280' }}>● Sisa Diaudit {remainCount}</span>
          </div>

          {/* PC Grid 8 columns */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: '5px',
          }}>
            {allPcs.map((pcNum) => {
              const isActive = pcNum === selectedPc
              const isMatch = filteredPcs.includes(pcNum)
              const cellStyle = getCellStyle(pcNum, isActive)
              const specText = getCellSpecText(pcNum)
              return (
                <button
                  type="button"
                  key={pcNum}
                  onClick={() => applyPcState(pcNum)}
                  style={{
                    ...cellStyle,
                    borderRadius: '7px',
                    padding: '5px 3px',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    opacity: isMatch ? 1 : 0.4,
                    transition: 'opacity 0.15s',
                    minHeight: '44px',
                  }}
                  title={`${pcCodeFromNumber(pcNum)}: ${getPcStatus(pcNum).toUpperCase()}`}
                  aria-label={`Pilih ${pcCodeFromNumber(pcNum)}`}
                >
                  <span style={{ fontWeight: isActive ? 900 : 700, fontSize: isActive ? '11px' : '10px' }}>
                    {String(pcNum).padStart(2, '0')}
                  </span>
                  {isActive ? (
                    <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#7dd3fc', letterSpacing: '0.03em' }}>AKTIF</span>
                  ) : (
                    <span style={{ fontSize: '8px', color: 'inherit', opacity: 0.8 }}>{specText}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '12px', fontSize: '9.5px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ color: '#4ade80' }}>■ Tersimpan Valid</span>
            <span style={{ color: '#f87171' }}>■ Rusak</span>
            <span style={{ color: '#38bdf8' }}>■ Aktif/Sedang Diaudit</span>
            <span style={{ color: '#4b5563' }}>■ Belum Diaudit</span>
          </div>
        </div>

        {/* ---- Bagian Bawah: Log Entri Audit ---- */}
        <div style={{ background: '#14161a', border: '1px solid #26292e', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
              ↻ Log Entri Audit Terkini ({labName})
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: '#042f2e', border: '1px solid #0d9488',
              borderRadius: '20px', padding: '3px 10px',
              fontSize: '9.5px', fontWeight: 700, color: '#2dd4bf',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#14b8a6', display: 'inline-block' }} />
              Sinkronisasi Lokal Aktif
            </span>
          </div>

          {recentAudits.length === 0 ? (
            <div style={{ fontSize: '11.5px', color: '#475569', textAlign: 'center', padding: '16px 0' }}>
              Belum ada data audit untuk lab ini.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentAudits.map((item) => {
                const isBad = item.is_faulty
                const timeStr = formatTime(item.audited_at)
                const statusLabel = isBad ? 'Bermasalah' : item.spec.standby_watt === 0 ? 'Mati Total' : 'Nominal'
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: isBad ? '#1a0a0a' : '#0d1117',
                      border: `1px solid ${isBad ? '#7f1d1d' : '#1e2129'}`,
                      borderRadius: '8px', padding: '8px 12px',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <span style={{ color: isBad ? '#ef4444' : '#22c55e', fontSize: '14px', flexShrink: 0 }}>●</span>
                      <div style={{ minWidth: 0 }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '12px',
                          color: isBad ? '#fca5a5' : '#ffffff',
                        }}>
                          {item.pc_number}
                        </span>
                        {' '}
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {isBad
                            ? (item.fault_note ?? 'Bermasalah / No Display')
                            : `RAM: ${item.spec.ram_gb} GB | SSD: ${item.spec.storage_gb} GB`}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 700,
                        color: isBad ? '#f87171' : '#4ade80',
                      }}>
                        {statusLabel}
                      </span>
                      <span style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)', color: '#475569' }}>
                        {timeStr}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel & standby summary (collapsed info) */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {(() => {
            const labPanel = panelOverview?.labs.find((l) => l.id === selectedLabId)
            const socketPanel = labPanel?.panels.find((p) => p.group_type === 'SOCKET') ?? null
            if (!socketPanel) return null
            return (
              <div style={{ flex: 1, minWidth: '200px', background: '#14161a', border: '1px solid #26292e', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>BEBAN PANEL MCB 10A</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                  <span style={{ fontSize: '17px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                    {number(socketPanel.load_watt ?? 0, 0)} <span style={{ fontSize: '10px', color: '#64748b' }}>W</span>
                  </span>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: socketPanel.status === 'NORMAL' ? '#4ade80' : '#f87171' }}>
                    {number(socketPanel.percent ?? 0, 1)}%
                  </span>
                </div>
                <ProgressBar
                  value={socketPanel.percent ?? 0}
                  tone={socketPanel.status === 'WARNING' || socketPanel.status === 'OVER' ? 'danger' : 'accent'}
                  height={4}
                />
              </div>
            )
          })()}

          <div style={{ flex: 1, minWidth: '200px', background: '#14161a', border: '1px solid #26292e', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '9.5px', color: '#f97316', fontWeight: 700, marginBottom: '4px' }}>PEMBOROSAN STANDBY LAB</div>
            <div style={{ fontSize: '17px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff', marginBottom: '2px' }}>
              {number(labAudits.reduce((s, i) => s + i.spec.standby_watt, 0), 0)} <span style={{ fontSize: '10px', color: '#64748b' }}>W total</span>
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              Dari {labAudits.filter((i) => i.spec.standby_watt > 0).length} unit aktif standby
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Suppress unused warning - handleSaveNext is kept for compatibility
  void handleSaveNext
  void handleReportOutlet
}

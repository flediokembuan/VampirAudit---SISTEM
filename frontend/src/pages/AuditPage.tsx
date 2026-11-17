import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  HardDrive,
  Layers,
  Monitor,
  Power,
  RefreshCw,
  Save,
  ShieldAlert,
  Trash2,
  Upload,
  Wifi,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { api, firstError } from '../lib/api'
import { Badge, ProgressBar } from '../components/ui'
import { useToast } from '../components/ToastProvider'
import type { ProgressLab } from '../types'

type UnitCondition = 'OFF' | 'NORMAL' | 'ANOMALY'

export default function AuditPage() {
  const toast = useToast()
  const [selectedLabId, setSelectedLabId] = useState<number>(1)
  const [selectedPc, setSelectedPc] = useState<number>(29)
  const [gridFilter, setGridFilter] = useState<'ALL' | 'UNVERIFIED' | 'PROBLEM'>('ALL')
  const [condition, setCondition] = useState<UnitCondition>('ANOMALY')
  const [saving, setSaving] = useState(false)

  // Checkboxes for Anomaly
  const [checkKabel, setCheckKabel] = useState(true)
  const [checkStopkontak, setCheckStopkontak] = useState(true)
  const [checkPsu, setCheckPsu] = useState(false)
  const [checkShutdown, setCheckShutdown] = useState(false)
  const [auditNote, setAuditNote] = useState(
    'Terdeteksi arus bocor saat kabel digerakkan, isolasi kabel luar robek dekat steker MCB meja.'
  )
  const [hasPhoto, setHasPhoto] = useState(true)

  // 40 PCs status map
  const getPcStatus = (num: number): 'off' | 'normal' | 'standby' | 'anomaly' | 'unverified' => {
    if (num === selectedPc) return condition === 'ANOMALY' ? 'anomaly' : condition === 'OFF' ? 'off' : 'normal'
    if (num > 28) return 'unverified'
    if (num === 11 || num === 29) return 'anomaly'
    if (num === 7 || num === 18 || num === 26) return 'standby'
    if (num === 3 || num === 6 || num === 12 || num === 21 || num === 23) return 'normal'
    return 'off'
  }

  const allPcs = Array.from({ length: 40 }, (_, i) => i + 1)

  const filteredPcs = allPcs.filter((num) => {
    const st = getPcStatus(num)
    if (gridFilter === 'UNVERIFIED') return st === 'unverified'
    if (gridFilter === 'PROBLEM') return st === 'anomaly' || st === 'standby'
    return true
  })

  function handleSelectPc(pcNum: number) {
    setSelectedPc(pcNum)
    if (pcNum === 29 || pcNum === 11) {
      setCondition('ANOMALY')
      setAuditNote('Terdeteksi arus bocor saat kabel digerakkan, isolasi kabel luar robek dekat steker MCB meja.')
      setCheckKabel(true)
      setCheckStopkontak(true)
      setHasPhoto(true)
    } else if (pcNum === 7 || pcNum === 18 || pcNum === 26) {
      setCondition('NORMAL')
    } else if (pcNum > 28) {
      setCondition('OFF')
      setAuditNote('')
      setCheckKabel(false)
      setCheckStopkontak(false)
      setHasPhoto(false)
    } else {
      setCondition('OFF')
    }
  }

  function handleSaveNext() {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast.success(`Data verifikasi PC-${String(selectedPc).padStart(2, '0')} berhasil disimpan!`)
      if (condition === 'ANOMALY') {
        toast.info('Tiket prioritas #TKT-2025-089 otomatis dikirim ke Facility Maintenance.')
      }
      const nextPc = Math.min(selectedPc + 1, 40)
      handleSelectPc(nextPc)
    }, 500)
  }

  return (
    <>
      {/* Top Header matching Desktop Stitch Image */}
      <div className="page-head" style={{ marginBottom: '16px' }}>
        <div>
          <div className="eyebrow" style={{ color: '#94a3b8' }}>
            AUDIT LAPANGAN &gt; FORM FAST-INPUT WORKSTATION (VERSI DESKTOP)
          </div>
          <h1>Audit Cepat Kelistrikan Meja Laboratorium &amp; Validasi Standby</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <select
            className="input"
            style={{
              width: '280px',
              height: '38px',
              fontSize: '12.5px',
              fontWeight: 700,
              backgroundColor: '#14161a',
              color: '#ffffff',
            }}
            value={selectedLabId}
            onChange={(e) => setSelectedLabId(Number(e.target.value))}
          >
            <option value={1}>Lab 1 Komputer Dasar (40 Unit PC)</option>
            <option value={2}>Lab 2 Rekayasa Perangkat Lunak (40 Unit PC)</option>
            <option value={3}>Lab 3 Jaringan &amp; Keamanan (40 Unit PC)</option>
            <option value={4}>Lab 4 AI &amp; Data Science (40 Unit PC)</option>
            <option value={5}>Lab 5 Multimedia &amp; Desain (40 Unit PC)</option>
            <option value={6}>Lab 6 Riset &amp; Inovasi (40 Unit PC)</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="badge-dot" style={{ backgroundColor: '#10b981' }} />
              Sinkronisasi Realtime Aktif (Latensi 14ms)
            </span>
            <span style={{ color: '#64748b' }}># BATCH: #AD-2024-Q2</span>
          </div>
        </div>
      </div>

      {/* Full-Width Kemajuan Bar */}
      <div className="audit-summary-strip">
        <div className="audit-summary-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8' }}>
              KEMAJUAN KESELURUHAN LAB 1
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#4edea3' }}>
              28 / 40 PC Terverifikasi (70%)
            </span>
            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '12px' }}>
              Target Sesi: 100% Sebelum 17:00
            </span>
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: '#10b981' }}>● 18 Mati (0W)</span>
            <span style={{ color: '#38bdf8' }}>● 8 Normal (5-145W)</span>
            <span style={{ color: '#f87171' }}>● 2 Bermasalah</span>
          </div>
        </div>

        <ProgressBar value={70} tone="accent" height={6} />
      </div>

      {/* 3-Column Desktop Grid */}
      <div className="audit-3col-grid">
        {/* ====================================================================
            COLUMN 1: DENAH GRID 40 UNIT PC
            ==================================================================== */}
        <section className="card" style={{ padding: '16px' }}>
          <div className="card-head" style={{ marginBottom: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Monitor size={15} color="#38bdf8" />
                <h3 className="card-title" style={{ fontSize: '13.5px' }}>Denah Grid 40 Unit PC</h3>
              </div>
              <p className="card-sub" style={{ fontSize: '10.5px' }}>Matriks Meja Auditor Lapangan</p>
            </div>
            <span className="badge badge-neutral" style={{ fontSize: '10px' }}>Lab-01 GK2</span>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
            <button
              className={`btn btn-xs ${gridFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '10px', height: '26px' }}
              onClick={() => setGridFilter('ALL')}
            >
              Semua (40)
            </button>
            <button
              className={`btn btn-xs ${gridFilter === 'UNVERIFIED' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '10px', height: '26px' }}
              onClick={() => setGridFilter('UNVERIFIED')}
            >
              Belum (12)
            </button>
            <button
              className={`btn btn-xs ${gridFilter === 'PROBLEM' ? 'btn-danger' : 'btn-secondary'}`}
              style={{ fontSize: '10px', height: '26px' }}
              onClick={() => setGridFilter('PROBLEM')}
            >
              Masalah (2)
            </button>
          </div>

          {/* Grid Subheader */}
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

          {/* 40 Grid Workstation Buttons */}
          <div className="grid-40-container">
            {allPcs.map((pcNum) => {
              const st = getPcStatus(pcNum)
              const isSelected = pcNum === selectedPc
              const isMatch = filteredPcs.includes(pcNum)
              return (
                <div
                  key={pcNum}
                  className={`pc-grid-cell ${st} ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectPc(pcNum)}
                  style={{ opacity: isMatch ? 1 : 0.2 }}
                  title={`PC-${String(pcNum).padStart(2, '0')}: ${st.toUpperCase()}`}
                >
                  {String(pcNum).padStart(2, '0')}
                </div>
              )
            })}
          </div>

          {/* Bottom Grid Legend */}
          <div className="grid-legend-row">
            <span style={{ color: '#10b981' }}>● Mati Total (0W)</span>
            <span style={{ color: '#38bdf8' }}>● Normal (145W)</span>
            <span style={{ color: '#fbbf24' }}>● Standby Boros (&gt;5W)</span>
            <span style={{ color: '#f87171' }}>● Anomali / Masalah</span>
          </div>
        </section>

        {/* ====================================================================
            COLUMN 2: WORKSTATION FAST-INPUT & ANOMALY FORM
            ==================================================================== */}
        <section className="card" style={{ padding: '20px' }}>
          {/* Active Workstation Bar */}
          {(() => {
            const deskRow = Math.ceil(selectedPc / 8)
            const deskSector = selectedPc === 29 ? 'C' : String.fromCharCode(64 + deskRow)
            return (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '14px',
                  borderBottom: '1px solid #26292e',
                  marginBottom: '16px',
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
                    PC-{String(selectedPc).padStart(2, '0')}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ fontSize: '15px', color: '#ffffff' }}>Meja Baris {deskRow}, Sektor {deskSector}</h2>
                      {condition === 'ANOMALY' && (
                        <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 700 }}>
                          Anomali Terdeteksi
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                      ID Perangkat: UNK-LAB0{selectedLabId}-PC{String(selectedPc).padStart(2, '0')}-GK2
                    </div>
                  </div>
                </div>

                {/* PC Next/Prev Navigation */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-xs btn-secondary"
                    onClick={() => handleSelectPc(Math.max(selectedPc - 1, 1))}
                  >
                    &lt; PC-{String(Math.max(selectedPc - 1, 1)).padStart(2, '0')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-secondary"
                    onClick={() => handleSelectPc(Math.min(selectedPc + 1, 40))}
                  >
                    PC-{String(Math.min(selectedPc + 1, 40)).padStart(2, '0')} &gt;
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Profil Spesifikasi Hardware Terdata Card */}
          <div style={{ backgroundColor: '#14161a', border: '1px solid #26292e', borderRadius: '12px', padding: '14px 16px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#e2e2e6' }}>
                <Cpu size={14} color="#38bdf8" />
                <span>Profil Spesifikasi Hardware Terdata</span>
              </div>
              <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 6px' }}>
                ● Auto-filled Master Data
              </span>
            </div>

            <div className="spec-2x3-grid">
              <div className="spec-cell-tile">
                <div className="label">CPU</div>
                <div className="val">Intel Core i5-1240...</div>
              </div>
              <div className="spec-cell-tile">
                <div className="label">RAM</div>
                <div className="val">16GB DDR4-3200...</div>
              </div>
              <div className="spec-cell-tile">
                <div className="label">PENYIMPANAN SSD</div>
                <div className="val">512GB NVMe M.2...</div>
              </div>
              <div className="spec-cell-tile">
                <div className="label">POWER SUPPLY</div>
                <div className="val">450W 80+ Bronze</div>
              </div>
              <div className="spec-cell-tile">
                <div className="label">MONITOR PERAGA</div>
                <div className="val">LG 24" IPS 24MK6...</div>
              </div>
              <div className="spec-cell-tile">
                <div className="label">KATEGORI BEBAN</div>
                <div className="val">Workstation Lab</div>
              </div>
            </div>

            {/* IoT Telemetry Strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid #1e2126',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {condition === 'OFF' ? (
                <>
                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Zap size={13} /> Telemetri IoT Meja Live: <strong>Tegangan 0.0V (Relay Cut-off)</strong>
                  </span>
                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Arus Standby: <strong>0.0 Watt</strong>
                    <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 5px' }}>
                      0W TERPUTUS
                    </span>
                  </span>
                </>
              ) : condition === 'NORMAL' ? (
                <>
                  <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Zap size={13} /> Telemetri IoT Meja Live: <strong>Tegangan 220.4V</strong>
                  </span>
                  <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Beban Operasional: <strong>142.5 Watt</strong>
                    <span className="badge badge-info" style={{ fontSize: '9px', padding: '1px 5px' }}>
                      NORMAL
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Zap size={13} /> Telemetri IoT Meja Live: <strong>Tegangan 219.2V</strong>
                  </span>
                  <span style={{ color: '#f97316', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Arus Standby: <strong>14.2 Watt</strong>
                    <span className="badge badge-warning" style={{ fontSize: '9px', padding: '1px 5px' }}>
                      &gt;5W BOROS
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* PILIH VALIDASI STATUS FISIK & KELISTRIKAN */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '8px' }}>
              <span>PILIH VALIDASI STATUS FISIK &amp; KELISTRIKAN</span>
              <span style={{ color: '#f97316' }}>WAJIB DIISI</span>
            </div>

            <div className="audit-trio-row">
              {/* Option 1: Mati Total */}
              <div
                className={`audit-trio-card ${condition === 'OFF' ? 'active-green' : ''}`}
                onClick={() => setCondition('OFF')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <Power size={18} color="#10b981" />
                  <span className="badge badge-success" style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)' }}>0 W</span>
                </div>
                <div>
                  <strong style={{ fontSize: '12.5px', color: '#ffffff', display: 'block' }}>Mati Total / Cabut</strong>
                  <small style={{ fontSize: '10.5px', color: '#94a3b8' }}>Stopkontak 0 Watt</small>
                </div>
              </div>

              {/* Option 2: Standby Normal */}
              <div
                className={`audit-trio-card ${condition === 'NORMAL' ? 'active-blue' : ''}`}
                onClick={() => setCondition('NORMAL')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <Monitor size={18} color="#38bdf8" />
                  <span className="badge badge-info" style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)' }}>5 - 150W</span>
                </div>
                <div>
                  <strong style={{ fontSize: '12.5px', color: '#ffffff', display: 'block' }}>Standby / Normal</strong>
                  <small style={{ fontSize: '10.5px', color: '#94a3b8' }}>Operasional wajar</small>
                </div>
              </div>

              {/* Option 3: Unit Bermasalah */}
              <div
                className={`audit-trio-card ${condition === 'ANOMALY' ? 'active-red' : ''}`}
                onClick={() => setCondition('ANOMALY')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <AlertTriangle size={18} color="#ef4444" />
                  <input
                    type="radio"
                    checked={condition === 'ANOMALY'}
                    onChange={() => setCondition('ANOMALY')}
                    style={{ accentColor: '#ef4444' }}
                  />
                </div>
                <div>
                  <strong style={{ fontSize: '12.5px', color: '#fca5a5', display: 'block' }}>Unit Bermasalah / Anomali</strong>
                  <small style={{ fontSize: '10.5px', color: '#94a3b8' }}>Konsleting, bocor arus</small>
                </div>
              </div>
            </div>
          </div>

          {/* Expanded Anomaly Form */}
          {condition === 'ANOMALY' && (
            <div className="anomaly-form-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wrench size={14} color="#f87171" />
                  <strong style={{ fontSize: '12.5px', color: '#ffffff' }}>
                    Formulir Kendala PC-{String(selectedPc).padStart(2, '0')} &amp; Tiket Otomatis
                  </strong>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span className="badge badge-danger" style={{ fontSize: '9.5px' }}>P1 Kritis</span>
                  <span className="badge badge-neutral" style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)' }}>
                    #TKT-2025-089
                  </span>
                </div>
              </div>

              {/* Checklist 2x2 */}
              <div className="checklist-2x2">
                <div
                  className={`checklist-item ${checkKabel ? 'checked' : ''}`}
                  onClick={() => setCheckKabel(!checkKabel)}
                >
                  <input type="checkbox" checked={checkKabel} readOnly style={{ accentColor: '#ef4444' }} />
                  <span>Kabel Power Terkelupas / Bahaya Sengatan</span>
                </div>

                <div
                  className={`checklist-item ${checkStopkontak ? 'checked' : ''}`}
                  onClick={() => setCheckStopkontak(!checkStopkontak)}
                >
                  <input type="checkbox" checked={checkStopkontak} readOnly style={{ accentColor: '#ef4444' }} />
                  <span>Stopkontak Meja Longgar / Sparking</span>
                </div>

                <div
                  className={`checklist-item ${checkPsu ? 'checked' : ''}`}
                  onClick={() => setCheckPsu(!checkPsu)}
                >
                  <input type="checkbox" checked={checkPsu} readOnly style={{ accentColor: '#ef4444' }} />
                  <span>PSU Suhu Tinggi (&gt;45°C)</span>
                </div>

                <div
                  className={`checklist-item ${checkShutdown ? 'checked' : ''}`}
                  onClick={() => setCheckShutdown(!checkShutdown)}
                >
                  <input type="checkbox" checked={checkShutdown} readOnly style={{ accentColor: '#ef4444' }} />
                  <span>Komputer Gagal Shutdown Otomatis</span>
                </div>
              </div>

              {/* Catatan Rinci Auditor */}
              <div className="field" style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '10.5px' }}>Catatan Rinci Auditor Lapangan:</label>
                <textarea
                  className="input textarea"
                  rows={2}
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  style={{ fontSize: '11.5px', lineHeight: 1.45 }}
                />
              </div>

              {/* Photo Proof Row */}
              <div className="proof-row">
                {hasPhoto ? (
                  <div className="proof-thumbnail-card">
                    <div className="proof-img-box">
                      <span>[Foto Kabel Terkelupas]</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: '#94a3b8' }}>
                      <span className="mono">kabel-sobek-pc29.jpg</span>
                      <button onClick={() => setHasPhoto(false)} style={{ color: '#f87171' }}>
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="proof-upload-box" onClick={() => setHasPhoto(true)}>
                    <Camera size={20} />
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Ambil Bukti Fisik</span>
                  </div>
                )}

                <div
                  className="proof-upload-box"
                  onClick={() => {
                    toast.info('Simulasi unggah foto kamera smartphone/webcam...')
                    setHasPhoto(true)
                  }}
                >
                  <Upload size={18} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#e2e2e6' }}>Unggah / Ambil Bukti Fisik</span>
                  <span style={{ fontSize: '9.5px', color: '#64748b' }}>JPG/PNG maks 5MB</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ====================================================================
            COLUMN 3: LIVE LAB LOAD, STANDBY WASTE & RECENT AUDIT HISTORY
            ==================================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Card 1: Beban Riil Lab 1 */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} color="#10b981" />
                <h3 className="card-title" style={{ fontSize: '13px' }}>Beban Riil Lab 1</h3>
              </div>
              <span className="badge badge-success" style={{ fontSize: '9px' }}>Aman</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
              <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>MCB 10A Meja Komputer</span>
              <span className="mono" style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>59.8% Kapasitas</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                1.316 <span style={{ fontSize: '11px', color: '#64748b' }}>Watt</span>
              </span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Maks 2.200W</span>
            </div>
            <ProgressBar value={59.8} tone="accent" height={5} />
          </div>

          {/* Card 2: Pemborosan Standby Lab 1 */}
          <div className="card" style={{ padding: '16px' }}>
            <div className="eyebrow" style={{ fontSize: '9.5px', color: '#f97316' }}>
              PEMBOROSAN STANDBY LAB 1
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '4px 0' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                142 <span style={{ fontSize: '11px', color: '#64748b' }}>Watt</span>
              </span>
              <span className="mono" style={{ fontSize: '11px', color: '#f87171', fontWeight: 600 }}>
                -Rp 148.000 / bln
              </span>
            </div>
            <p style={{ fontSize: '10.5px', color: '#94a3b8', lineHeight: 1.4 }}>
              Proyeksi rugi daya jika 8 unit PC tidak dimatikan total pada jam malam kampus.
            </p>
          </div>

          {/* Card 3: Riwayat 4 PC Terakhir */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} color="#94a3b8" />
                <h3 className="card-title" style={{ fontSize: '12.5px' }}>RIWAYAT 4 PC TERAKHIR</h3>
              </div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Hari ini</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="recent-audit-item">
                <span className="mono" style={{ fontWeight: 700, color: '#ffffff' }}>PC-28</span>
                <div style={{ fontSize: '10.5px', textAlign: 'right' }}>
                  <div>Mati Total (0W)</div>
                  <div style={{ color: '#64748b', fontSize: '9.5px' }}>14:21 • Auditor Lapangan</div>
                </div>
                <CheckCircle2 size={14} color="#10b981" />
              </div>

              <div className="recent-audit-item">
                <span className="mono" style={{ fontWeight: 700, color: '#ffffff' }}>PC-27</span>
                <div style={{ fontSize: '10.5px', textAlign: 'right' }}>
                  <div>Mati Total (0W)</div>
                  <div style={{ color: '#64748b', fontSize: '9.5px' }}>14:18 • Auditor Lapangan</div>
                </div>
                <CheckCircle2 size={14} color="#10b981" />
              </div>

              <div className="recent-audit-item">
                <span className="mono" style={{ fontWeight: 700, color: '#fbbf24' }}>PC-26</span>
                <div style={{ fontSize: '10.5px', textAlign: 'right' }}>
                  <div>Standby (8W)</div>
                  <div style={{ color: '#64748b', fontSize: '9.5px' }}>14:15 • Auditor Lapangan</div>
                </div>
                <AlertTriangle size={14} color="#f59e0b" />
              </div>

              <div className="recent-audit-item">
                <span className="mono" style={{ fontWeight: 700, color: '#ffffff' }}>PC-25</span>
                <div style={{ fontSize: '10.5px', textAlign: 'right' }}>
                  <div>Mati Total (0W)</div>
                  <div style={{ color: '#64748b', fontSize: '9.5px' }}>14:10 • Auditor Lapangan</div>
                </div>
                <CheckCircle2 size={14} color="#10b981" />
              </div>
            </div>
          </div>

          {/* Action Buttons Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              className="login-submit-btn"
              onClick={handleSaveNext}
              disabled={saving}
              style={{ height: '42px', fontSize: '12.5px' }}
            >
              <ArrowRight size={16} />
              <span>
                Simpan Hasil Verifikasi PC-{String(selectedPc).padStart(2, '0')} &amp; Lanjut ke PC-{String(Math.min(selectedPc + 1, 40)).padStart(2, '0')}
              </span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-danger"
              style={{ height: '36px', fontSize: '11.5px', fontWeight: 600 }}
              onClick={() => toast.warning(`Meja PC-${selectedPc} ditandai butuh penggantian stopkontak!`)}
            >
              <AlertTriangle size={13} />
              Tandai Meja Perlu Penggantian Stopkontak
            </button>

            <button
              type="button"
              style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', background: 'none', padding: '4px' }}
              onClick={() => {
                const next = Math.min(selectedPc + 1, 40)
                handleSelectPc(next)
                toast.info(`PC-${String(selectedPc).padStart(2, '0')} dilewati sementara.`)
              }}
            >
              Lewati Sementara (Audit Nanti)
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

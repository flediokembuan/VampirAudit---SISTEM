import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RotateCcw,
  Shield,
  ShieldAlert,
  Table,
  Zap,
} from 'lucide-react'
import { roleHome, useAuth } from '../auth/AuthContext'
import { firstError } from '../lib/api'

type SimulatorState = 'normal' | 'invalid_credentials' | 'account_locked' | 'empty_fields' | 'loading'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('dosen.admin@unklab.ac.id')
  const [password, setPassword] = useState('Vampir#2026')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [simState, setSimState] = useState<SimulatorState>('normal')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Email institusi dan kata sandi wajib diisi.')
      setSimState('empty_fields')
      return
    }

    setError('')
    setSubmitting(true)
    setSimState('loading')

    try {
      const user = await login(email, password)
      navigate(roleHome[user.role], { replace: true })
    } catch (caught) {
      setError(firstError(caught))
      setSimState('invalid_credentials')
    } finally {
      setSubmitting(false)
    }
  }

  function handleSimulate(state: SimulatorState) {
    setSimState(state)
    switch (state) {
      case 'invalid_credentials':
        setError('Kredensial tidak cocok dengan database sivitas akademika UNKLAB.')
        break
      case 'account_locked':
        setError('Akun ditangguhkan sementara: Terdeteksi 5 kali percobaan login gagal berturut-turut.')
        break
      case 'empty_fields':
        setEmail('')
        setPassword('')
        setError('Email institusi dan kata sandi wajib diisi.')
        break
      case 'loading':
        setError('')
        setSubmitting(true)
        setTimeout(() => {
          setSubmitting(false)
          setSimState('normal')
        }, 3000)
        break
      case 'normal':
        setEmail('dosen.admin@unklab.ac.id')
        setPassword('Vampir#2026')
        setError('')
        setSubmitting(false)
        break
    }
  }

  function handleRoleClick(roleEmail: string) {
    setEmail(roleEmail)
    setPassword('Vampir#2026')
    setError('')
    setSimState('normal')
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0c0e11',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "var(--font-body, 'Geist', sans-serif)",
    }}>

      {/* ── Top Bar with macOS Window Dots & Institutional Title ── */}
      <header style={{
        height: '46px',
        backgroundColor: '#111316',
        borderBottom: '1px solid #1e2430',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        fontSize: '11px',
      }}>
        {/* Left: 3 Mac-style dots + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontWeight: 600 }}>
            <Zap size={14} style={{ color: '#38bdf8' }} />
            <strong style={{ letterSpacing: '0.04em', color: '#ffffff' }}>SISTEM AUDIT LISTRIK VAMPIR</strong>
            <span style={{ color: '#475569' }}>|</span>
            <span style={{ color: '#94a3b8' }}>Fakultas Ilmu Komputer · Universitas Klabat</span>
          </div>
        </div>

        {/* Right Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            backgroundColor: '#052e16', border: '1px solid #16a34a', borderRadius: '16px',
            padding: '3px 10px', fontSize: '10px', fontWeight: 700, color: '#4ade80', letterSpacing: '0.05em',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
            GREEN CAMPUS UNKLAB
          </span>

          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            backgroundColor: '#0d131a', border: '1px solid #1e293b', borderRadius: '6px',
            padding: '3px 9px', fontSize: '10.5px', fontFamily: 'var(--font-mono, monospace)', color: '#94a3b8',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
            NODE 01-PROD
          </span>
        </div>
      </header>

      {/* ── Main Viewport (2 Columns) ── */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1160px',
          display: 'grid',
          gridTemplateColumns: '1.15fr 0.95fr',
          gap: '24px',
          alignItems: 'start',
        }}>

          {/* ══════════════════════════════════════════════════════════
              LEFT COLUMN: Institutional Scope & Methodology
              ══════════════════════════════════════════════════════════ */}
          <div
            className="login-stagger"
            style={{
              backgroundColor: '#111316',
              border: '1px solid #1e2430',
              borderRadius: '14px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            
            {/* Tag badge */}
            <div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                backgroundColor: '#042f2e', border: '1px solid #0d9488', borderRadius: '14px',
                padding: '3px 10px', fontSize: '10px', fontWeight: 700, color: '#2dd4bf', letterSpacing: '0.06em',
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#14b8a6' }} />
                GREEN CAMPUS UNKLAB • FIK
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
                margin: '0 0 10px',
              }}>
                Sistem Audit Listrik Vampir UNKLAB
              </h1>
              <p style={{
                fontSize: '12.5px',
                color: '#94a3b8',
                lineHeight: 1.55,
                margin: 0,
              }}>
                Platform terpadu pemantauan dan audit kehilangan daya standby (vampire load) pada laboratorium komputer Fakultas Ilmu Komputer Universitas Klabat.
              </p>
            </div>

            {/* 2-Column Stat Box */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              backgroundColor: '#0d0f12',
              border: '1px solid #1e2430',
              borderRadius: '10px',
              padding: '16px 18px',
            }}>
              {/* Stat 1: Cakupan Audit */}
              <div>
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748b', textTransform: 'uppercase' }}>
                  CAKUPAN AUDIT
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0 2px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'var(--font-mono, monospace)', color: '#ffffff' }}>
                    6
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>Lab Komputer</span>
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  Lab 1 Komputer Dasar s/d Lab 6 Riset IoT
                </div>
              </div>

              {/* Stat 2: Perangkat Terdata */}
              <div>
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748b', textTransform: 'uppercase' }}>
                  PERANGKAT TERDATA
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0 2px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'var(--font-mono, monospace)', color: '#34d399' }}>
                    240
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>Total PC Workstation</span>
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  Rata-rata 35-40 unit aktif per lab
                </div>
              </div>
            </div>

            {/* Metodologi Audit Standar Box */}
            <div style={{
              backgroundColor: '#0d0f12',
              border: '1px solid #1e2430',
              borderRadius: '10px',
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Table size={14} style={{ color: '#38bdf8' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>
                  Metodologi Audit Standar
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.5, fontFamily: 'var(--font-mono, monospace)' }}>
                Audit manual &amp; kalkulasi standar: daya standby 5 W/unit, beban aktif 150 W, tarif PLN Rp 1.444,70/kWh, faktor emisi 0,78 kgCO2e/kWh.
              </p>
            </div>

            {/* Informasi Alur Peran Box */}
            <div style={{
              backgroundColor: '#0d0f12',
              border: '1px solid #1e2430',
              borderRadius: '10px',
              padding: '14px 16px',
            }}>
              <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748b', marginBottom: '12px' }}>
                ⑂ INFORMASI ALUR PERAN • PENGARAHAN RUTE OTOMATIS
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Role 1: Dosen PJ / Admin */}
                <button
                  type="button"
                  className="login-role-btn"
                  data-selected={email === 'dosen.admin@unklab.ac.id' ? 'true' : undefined}
                  onClick={() => handleRoleClick('dosen.admin@unklab.ac.id')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
                    <strong style={{ fontSize: '11px', color: '#ffffff' }}>Dosen PJ / Admin</strong>
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '3px', fontFamily: 'var(--font-mono, monospace)' }}>
                    L-02 Dasbor Energi • L-03 Master Data
                  </div>
                </button>

                {/* Role 2: Auditor Lapangan */}
                <button
                  type="button"
                  className="login-role-btn"
                  data-selected={email === 'auditor@unklab.ac.id' ? 'true' : undefined}
                  onClick={() => handleRoleClick('auditor@unklab.ac.id')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34d399' }} />
                    <strong style={{ fontSize: '11px', color: '#ffffff' }}>Auditor Lapangan</strong>
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#34d399', marginTop: '3px', fontFamily: 'var(--font-mono, monospace)' }}>
                    L-04 Fast-Input Audit
                  </div>
                </button>

                {/* Role 3: Facility Maintenance */}
                <button
                  type="button"
                  className="login-role-btn"
                  data-selected={email === 'maintenance@unklab.ac.id' ? 'true' : undefined}
                  onClick={() => handleRoleClick('maintenance@unklab.ac.id')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f97316' }} />
                    <strong style={{ fontSize: '11px', color: '#ffffff' }}>Facility Maintenance</strong>
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#f97316', marginTop: '3px', fontFamily: 'var(--font-mono, monospace)' }}>
                    L-05 Monitoring MCB
                  </div>
                </button>

                {/* Role 4: Pimpinan Kampus */}
                <button
                  type="button"
                  className="login-role-btn"
                  data-selected={email === 'pimpinan@unklab.ac.id' ? 'true' : undefined}
                  onClick={() => handleRoleClick('pimpinan@unklab.ac.id')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#a78bfa' }} />
                    <strong style={{ fontSize: '11px', color: '#ffffff' }}>Pimpinan Kampus</strong>
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '3px', fontFamily: 'var(--font-mono, monospace)' }}>
                    L-06 Eksekutif • PDF
                  </div>
                </button>
              </div>
            </div>

          </div>

          {/* ══════════════════════════════════════════════════════════
              RIGHT COLUMN: Login Form + Demo Simulator State
              ══════════════════════════════════════════════════════════ */}
          <div className="login-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '50ms' }}>
            
            {/* ── Top Box: Masuk ke Sistem Form ── */}
            <div style={{
              backgroundColor: '#111316',
              border: '1px solid #1e2430',
              borderRadius: '14px',
              padding: '24px 26px',
            }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px' }}>
                    Masuk ke Sistem
                  </h2>
                  <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: 0 }}>
                    Gunakan akun kredensial institusi resmi UNKLAB
                  </p>
                </div>

                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: '#1a1f2e', border: '1px solid #2d3748',
                  display: 'grid', placeItems: 'center', color: '#94a3b8',
                }}>
                  <Shield size={16} />
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Field 1: Email */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label htmlFor="loginEmail" style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.04em' }}>
                      Email Institusi
                    </label>
                    <span style={{ fontSize: '10.5px', color: '#64748b', fontFamily: 'var(--font-mono, monospace)' }}>
                      Domain @unklab.ac.id
                    </span>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                      color: '#64748b', fontSize: '13px', fontFamily: 'var(--font-mono, monospace)', pointerEvents: 'none',
                    }}>
                      @
                    </span>
                    <input
                      id="loginEmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@unklab.ac.id"
                      required
                      style={{
                        width: '100%',
                        backgroundColor: '#0c0e11',
                        border: '1px solid #242c38',
                        borderRadius: '8px',
                        padding: '10px 14px 10px 32px',
                        fontSize: '12.5px',
                        color: '#ffffff',
                        fontFamily: 'var(--font-mono, monospace)',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Field 2: Password */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label htmlFor="loginPassword" style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.04em' }}>
                      Kata Sandi
                    </label>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <KeyRound size={14} style={{
                      position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                      color: '#64748b', pointerEvents: 'none',
                    }} />
                    <input
                      id="loginPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      style={{
                        width: '100%',
                        backgroundColor: '#0c0e11',
                        border: '1px solid #242c38',
                        borderRadius: '8px',
                        padding: '10px 38px 10px 34px',
                        fontSize: '12.5px',
                        color: '#ffffff',
                        fontFamily: 'var(--font-mono, monospace)',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password"
                      style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0,
                      }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div style={{
                    backgroundColor: '#450a0a',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '11px',
                    color: '#fca5a5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <ShieldAlert size={14} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="pressable login-submit-primary"
                  disabled={submitting}
                  style={{
                    marginTop: '4px',
                    width: '100%',
                    height: '42px',
                    backgroundColor: '#34d399',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#064e3b',
                    fontSize: '13px',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span>→]</span>
                  <span>{submitting ? 'Memverifikasi Kredensial...' : 'Masuk ke Sistem →'}</span>
                </button>

                {/* Security encryption text */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '10.5px',
                  color: '#64748b',
                  marginTop: '4px',
                }}>
                  <Lock size={12} style={{ color: '#2dd4bf' }} />
                  <span>Koneksi aman terenkripsi TLS 1.3 FIK-UNKLAB</span>
                </div>
              </form>
            </div>

            {/* ── Bottom Box: DEMO SIMULATOR STATE AUTENTIKASI ── */}
            <div style={{
              backgroundColor: '#111316',
              border: '1px solid #1e2430',
              borderRadius: '14px',
              padding: '16px 20px',
            }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={13} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em', color: '#cbd5e1' }}>
                    DEMO SIMULATOR STATE AUTENTIKASI
                  </span>
                </div>

                <span style={{
                  fontSize: '9.5px',
                  fontFamily: 'var(--font-mono, monospace)',
                  backgroundColor: '#0d131a',
                  border: '1px solid #242c38',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  color: simState === 'normal' ? '#10b981' : '#f59e0b',
                }}>
                  State: {simState === 'normal' ? 'Normal' : simState === 'invalid_credentials' ? 'Kredensial Salah' : simState === 'account_locked' ? 'Akun Terkunci' : simState === 'empty_fields' ? 'Field Kosong' : 'Loading'}
                </span>
              </div>

              {/* 4 State Buttons (2x2 Grid) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                
                {/* State 1 */}
                <button
                  type="button"
                  className="pressable"
                  onClick={() => handleSimulate('invalid_credentials')}
                  style={{
                    backgroundColor: simState === 'invalid_credentials' ? '#1e2430' : '#0d0f12',
                    border: `1px solid ${simState === 'invalid_credentials' ? '#ef4444' : '#1e2430'}`,
                    borderRadius: '6px',
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease, border-color 150ms ease, transform var(--duration-press) var(--ease-out)',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#f87171' }}>⊗ State 1</div>
                  <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '1px' }}>Kredensial Salah</div>
                </button>

                {/* State 2 */}
                <button
                  type="button"
                  className="pressable"
                  onClick={() => handleSimulate('account_locked')}
                  style={{
                    backgroundColor: simState === 'account_locked' ? '#1e2430' : '#0d0f12',
                    border: `1px solid ${simState === 'account_locked' ? '#f59e0b' : '#1e2430'}`,
                    borderRadius: '6px',
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease, border-color 150ms ease, transform var(--duration-press) var(--ease-out)',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#fbbf24' }}>⚙ State 2</div>
                  <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '1px' }}>Akun Terkunci</div>
                </button>

                {/* State 3 */}
                <button
                  type="button"
                  className="pressable"
                  onClick={() => handleSimulate('empty_fields')}
                  style={{
                    backgroundColor: simState === 'empty_fields' ? '#1e2430' : '#0d0f12',
                    border: `1px solid ${simState === 'empty_fields' ? '#38bdf8' : '#1e2430'}`,
                    borderRadius: '6px',
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease, border-color 150ms ease, transform var(--duration-press) var(--ease-out)',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8' }}>=✗ State 3</div>
                  <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '1px' }}>Field Kosong</div>
                </button>

                {/* State 4 */}
                <button
                  type="button"
                  className="pressable"
                  onClick={() => handleSimulate('loading')}
                  style={{
                    backgroundColor: simState === 'loading' ? '#1e2430' : '#0d0f12',
                    border: `1px solid ${simState === 'loading' ? '#34d399' : '#1e2430'}`,
                    borderRadius: '6px',
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease, border-color 150ms ease, transform var(--duration-press) var(--ease-out)',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#34d399' }}>↻ State 4</div>
                  <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '1px' }}>Loading Verifikasi</div>
                </button>
              </div>

              {/* Reset link */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="login-reset-btn"
                  onClick={() => handleSimulate('normal')}
                >
                  <RotateCcw size={11} />
                  <span>Reset ke Form Awal</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        height: '42px',
        backgroundColor: '#0c0e11',
        borderTop: '1px solid #1e2430',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        fontSize: '11px',
        color: '#64748b',
      }}>
        <span>© 2024 Fakultas Ilmu Komputer, Universitas Klabat. Inisiatif Green Campus &amp; Efisiensi Daya Vampir.</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
          <span>Sistem Siap (Offline-First Ready)</span>
          <span>|</span>
          <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>Protokol IoT FIK-v2.4</span>
        </div>
      </footer>
    </div>
  )
}

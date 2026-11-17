import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  Check,
  Eye,
  EyeOff,
  Gauge,
  Lock,
  Mail,
  Monitor,
  ShieldAlert,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react'
import { roleHome, useAuth } from '../auth/AuthContext'
import { firstError } from '../lib/api'

interface DemoAccount {
  role: string
  name: string
  email: string
  title: string
  desc: string
  code: string
}

const demoAccounts: DemoAccount[] = [
  {
    role: 'ADMIN',
    name: 'Dosen Admin',
    email: 'admin@unklab.ac.id',
    title: 'Dosen Admin',
    desc: 'Hak Akses Penuh',
    code: 'L-02 Telemetri & L-06 RBAC',
  },
  {
    role: 'AUDITOR',
    name: 'Auditor Lapangan',
    email: 'auditor@unklab.ac.id',
    title: 'Auditor Lapangan',
    desc: 'Inspeksi & QR Audit',
    code: 'L-03 Form Input Lapangan',
  },
  {
    role: 'MAINTENANCE',
    name: 'Facility Maintenance',
    email: 'maintenance@unklab.ac.id',
    title: 'Facility Maint.',
    desc: 'Beban MCB & Alert',
    code: 'L-04 Mitigasi Trip & Fuse',
  },
  {
    role: 'PIMPINAN',
    name: 'Pimpinan Kampus',
    email: 'pimpinan@unklab.ac.id',
    title: 'Pimpinan Kampus',
    desc: 'Ringkasan Eksekutif',
    code: 'L-05 Biaya Listrik & ESG',
  },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('dosen.admin@unklab.ac.id')
  const [password, setPassword] = useState('Vampir#2026')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login(email, password)
      navigate(roleHome[user.role], { replace: true })
    } catch (caught) {
      setError(firstError(caught))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDemoSelect(account: DemoAccount) {
    setEmail(account.email)
    setPassword('Vampir#2026')
    setError('')
    setSubmitting(true)
    try {
      const user = await login(account.email, 'Vampir#2026')
      navigate(roleHome[user.role], { replace: true })
    } catch (caught) {
      setError(firstError(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      {/* Top Telemetry Institutional Bar (As in Stitch Screen 1) */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="campus-pill">
            <span className="dot" /> GREEN CAMPUS UNKLAB
          </span>
          <span className="topbar-pipe">|</span>
          <span className="telemetry-status">Grid Telemetry Active (220.4V avg)</span>
        </div>

        <div className="topbar-right">
          <button className="notif-bell" aria-label="Notifikasi">
            <Bell size={16} />
            <span className="notif-dot" />
          </button>
          <div className="user-profile-widget">
            <div className="user-profile-copy">
              <div className="user-profile-name">Dosen Admin</div>
              <div className="user-profile-dept">Fakultas Ilmu Komputer</div>
            </div>
            <div className="user-avatar-badge">DA</div>
          </div>
        </div>
      </header>

      {/* Main Login Viewport */}
      <div className="login-layout">
        {/* Left Branding & Live Wave Telemetry */}
        <section className="login-intro">
          {/* Tag pills */}
          <div className="login-tag-row">
            <span className="login-tag">GREEN CAMPUS INITIATIVE</span>
            <span className="login-tag">FILKOM • UNKLAB</span>
            <span className="login-tag online">
              <span className="badge-dot" /> Grid Online 220V
            </span>
          </div>

          {/* Logo & Platform Name */}
          <div className="login-brand-stitch">
            <div className="login-brand-icon">
              <Zap size={24} fill="currentColor" strokeWidth={0} />
            </div>
            <div className="login-brand-text">
              <h2>VampireMonitor UNKLAB</h2>
              <p>Sistem Telemetri Konsumsi Energi &amp; Deteksi Beban Siluman</p>
            </div>
          </div>

          {/* Headline */}
          <h1 className="login-headline">
            Pantau &amp; Hentikan Pemborosan Listrik Standby di{' '}
            <span className="mint">6 Lab Komputer</span>
          </h1>

          <p className="login-subhead">
            Sistem telemetri presisi tinggi untuk memitigasi konsumsi parasitik (vampire draw),
            verifikasi integritas 240 unit workstation, dan mencegah trip MCB fasa tunggal secara
            real-time pada Gedung Kuliah Terpadu Lt. 3.
          </p>

          {/* Live Wave Chart Box */}
          <div className="login-wave-tile">
            <div className="login-wave-header">
              <span className="login-wave-title">
                <span className="badge-dot" style={{ backgroundColor: '#10b981' }} />
                POLA BEBAN VAMPIR HARIAN (00:00 - 06:00 WITA)
              </span>
              <span className="login-wave-val">
                Standby Aktif: <strong>4.82 kW</strong>
              </span>
            </div>

            {/* SVG Wave graphic with anomaly dot */}
            <svg
              className="login-wave-chart"
              viewBox="0 0 500 70"
              preserveAspectRatio="none"
              fill="none"
            >
              <defs>
                <linearGradient id="waveGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 50 Q 70 50, 120 45 T 240 40 T 310 18 T 370 12 T 420 40 T 500 48 L 500 70 L 0 70 Z"
                fill="url(#waveGlow)"
              />
              <path
                d="M 0 50 Q 70 50, 120 45 T 240 40 T 310 18 T 370 12 T 420 40 T 500 48"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Anomaly circle at peak */}
              <circle cx="340" cy="22" r="5" fill="#f97316" stroke="#ffffff" strokeWidth="2" />
            </svg>

            <div className="login-wave-footer">
              <span>Lab 301-306 Total Idle State</span>
              <span style={{ color: '#10b981' }}>Anomali Terkendali (92% Normal)</span>
            </div>
          </div>

          {/* 3 Metric Cards Row */}
          <div className="login-tri-cards">
            <div className="login-tri-card blue">
              <div className="tri-card-label">INVENTARIS UNIT</div>
              <div className="tri-card-val">240 <span style={{ fontSize: '11px', color: '#94a3b8' }}>PC</span></div>
              <div className="tri-card-sub">6 Lab Terpadu Lt. 3</div>
            </div>

            <div className="login-tri-card amber">
              <div className="tri-card-label">BATAS BEBAN MCB</div>
              <div className="tri-card-val">10A <span style={{ fontSize: '12px', color: '#64748b' }}>/ 40A</span></div>
              <div className="tri-card-sub">2.2kW PC • 8.8kW AC</div>
            </div>

            <div className="login-tri-card green">
              <div className="tri-card-label">TARGET EFISIENSI</div>
              <div className="tri-card-val" style={{ color: '#4edea3' }}>-6.5%</div>
              <div className="tri-card-sub">Vampire Draw Reduksi</div>
            </div>
          </div>
        </section>

        {/* Right Login Panel */}
        <section className="login-panel-stitch">
          <div className="login-card-head">
            <h3>Masuk ke Portal Audit</h3>
            <span className="badge badge-success">
              <span className="badge-dot" /> SSO Ready
            </span>
          </div>
          <p className="login-card-desc">
            Autentikasi akun institusi UNKLAB atau pilih simulasi peran operasional.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <div className="field-label-row">
                <label htmlFor="loginEmail">EMAIL / NIM / NIDN</label>
                <span className="field-hint-text">UNKLAB Single Sign-On</span>
              </div>
              <div className="input-icon-wrap">
                <Mail size={16} />
                <input
                  id="loginEmail"
                  className="input"
                  type="email"
                  placeholder="dosen.admin@unklab.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <div className="field-label-row">
                <label htmlFor="loginPassword">KATA SANDI</label>
                <a href="#forgot" className="field-hint-text" style={{ color: '#38bdf8' }} onClick={(e) => e.preventDefault()}>
                  Lupa Sandi?
                </a>
              </div>
              <div className="input-icon-wrap">
                <Lock size={16} />
                <input
                  id="loginPassword"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="login-remember-row">
              <label className="login-checkbox-label">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ accentColor: '#10b981' }}
                />
                <span>Ingat sesi saya di terminal ini</span>
              </label>
              <span className="mono" style={{ fontSize: '11px', color: '#64748b' }}>TLS 1.3</span>
            </div>

            {error && (
              <div className="inline-error" style={{ marginBottom: '14px' }}>
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="login-submit-btn" disabled={submitting}>
              <ArrowRight size={18} />
              <span>{submitting ? 'Memverifikasi Kredensial...' : 'Masuk ke Sistem Telemetri'}</span>
            </button>
          </form>

          {/* RBAC Simulation Section */}
          <div className="rbac-section-title">
            <span>AKSES CEPAT SIMULASI PERAN (RBAC)</span>
          </div>

          <div className="rbac-demo-grid">
            {demoAccounts.map((acc) => {
              const isSelected = email === acc.email
              return (
                <button
                  key={acc.email}
                  type="button"
                  className={`rbac-demo-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleDemoSelect(acc)}
                >
                  <div className="rbac-card-title">
                    <span>{acc.title}</span>
                    <ArrowRight size={13} />
                  </div>
                  <div className="rbac-card-desc">{acc.desc}</div>
                  <div className="rbac-card-sub">{acc.code}</div>
                </button>
              )
            })}
          </div>

          <div className="login-footer-copy">
            <div>© 2025 Universitas Klabat — Green Campus Telemetry Protocol v2.4</div>
            <div style={{ color: '#4b535d', marginTop: '2px' }}>
              Fakultas Ilmu Komputer • Smart Energy Management Unit
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

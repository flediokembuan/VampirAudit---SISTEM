import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, Zap } from 'lucide-react'
import { roleLabels, useAuth } from '../auth/AuthContext'
import { prefetchRoleData } from '../lib/api'
import { initials } from '../lib/format'
import type { Role } from '../types'

interface NavItem {
  to: string
  labelLine1: string
  labelLine2: string
}

const roleNavs: Record<Role, NavItem[]> = {
  ADMIN: [
    { to: '/dashboard', labelLine1: 'Dasbor Energi', labelLine2: '6 Lab' },
    { to: '/specs',     labelLine1: 'Master Data',   labelLine2: '& RBAC' },
    { to: '/panels',   labelLine1: 'Live Panel',     labelLine2: 'MCB' },
    { to: '/executive',labelLine1: 'Ringkasan',      labelLine2: 'Eksekutif' },
  ],
  AUDITOR: [
    { to: '/dashboard', labelLine1: 'Dasbor Energi', labelLine2: '6 Lab' },
    { to: '/audit',     labelLine1: 'Form Audit',    labelLine2: 'Lapangan' },
  ],
  MAINTENANCE: [
    { to: '/panels', labelLine1: 'Live Panel', labelLine2: 'MCB' },
  ],
  PIMPINAN: [
    { to: '/executive', labelLine1: 'Ringkasan', labelLine2: 'Eksekutif' },
  ],
}

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const role = user?.role

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  useEffect(() => {
    if (!role) return
    const timer = window.setTimeout(() => {
      prefetchRoleData(role)
    }, 150)
    return () => window.clearTimeout(timer)
  }, [role])

  if (!user) return null

  const nav = roleNavs[user.role]

  return (
    <div className="app-shell">
      {/* ── Main Navbar ── */}
      <header className="topbar">

        {/* LEFT — Logo / Brand */}
        <div className="topbar-brand">
          <div className="brand-icon-wrap">
            <Zap size={20} />
          </div>
          <div className="brand-text-block">
            <div className="brand-title">SISTEM AUDIT LISTRIK VAMPIR</div>
            <div className="brand-row2">
              <span className="campus-pill">
                <span className="dot" />
                GREEN CAMPUS UNKLAB
              </span>
              <span className="brand-subtitle">Fakultas Ilmu Komputer · Universitas Klabat</span>
            </div>
          </div>
        </div>

        {/* CENTER — Nav tabs */}
        <nav className="topbar-nav" aria-label="Navigasi Utama">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
            >
              <span className="nav-tab-l1">{item.labelLine1}</span>
              <span className="nav-tab-l2">{item.labelLine2}</span>
            </NavLink>
          ))}
        </nav>

        {/* RIGHT — User info + logout */}
        <div className="topbar-user">
          <div className="user-avatar-badge" title={roleLabels[user.role]}>
            {initials(user.name)}
          </div>
          <div className="user-copy">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{roleLabels[user.role]}</div>
          </div>
          <button
            className="logout-btn"
            onClick={() => void logout()}
            aria-label="Keluar dari sistem"
            title="Keluar / Ganti Akun"
          >
            → Keluar
            <LogOut size={13} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="page">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <span className="footer-copy">
          © 2024 Fakultas Ilmu Komputer, Universitas Klabat. Inisiatif Green Campus &amp; Efisiensi Daya Vampir.
        </span>
        <span className="footer-status">
          <span className="footer-dot" />
          Telemetry Grid Online
          <span className="footer-pipe">|</span>
          Protokol IoT FIK-v2.4
        </span>
      </footer>
    </div>
  )
}

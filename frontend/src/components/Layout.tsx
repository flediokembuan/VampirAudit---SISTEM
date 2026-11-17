import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  LogOut,
  Monitor,
  Settings,
  Users,
} from 'lucide-react'
import { roleLabels, useAuth } from '../auth/AuthContext'
import { initials } from '../lib/format'
import type { Role } from '../types'

interface NavItem {
  to: string
  label: string
  short: string
  icon: typeof LayoutDashboard
  code?: string
}

const roleNavs: Record<Role, NavItem[]> = {
  ADMIN: [
    { to: '/dashboard', label: 'Dasbor Utama & 6 Lab', short: 'Dasbor', icon: LayoutDashboard, code: 'L-02' },
    { to: '/audit', label: 'Form Audit Lapangan', short: 'Audit', icon: ClipboardList, code: 'L-03' },
    { to: '/panels', label: 'Panel MCB & Insiden', short: 'Panel', icon: Gauge, code: 'L-04' },
    { to: '/executive', label: 'Dashboard Eksekutif', short: 'Eksekutif', icon: BarChart3, code: 'L-05' },
    { to: '/specs', label: 'Master Inventaris PC', short: 'Master', icon: Monitor, code: 'L-06' },
    { to: '/users', label: 'Pengguna & RBAC', short: 'Pengguna', icon: Users },
    { to: '/settings', label: 'Pengaturan Sistem', short: 'Setelan', icon: Settings },
  ],
  AUDITOR: [
    { to: '/audit', label: 'Form Audit Lapangan', short: 'Audit', icon: ClipboardList, code: 'L-03' },
  ],
  MAINTENANCE: [
    { to: '/panels', label: 'Panel MCB & Insiden', short: 'Panel', icon: Gauge, code: 'L-04' },
  ],
  PIMPINAN: [
    { to: '/executive', label: 'Dashboard Eksekutif', short: 'Eksekutif', icon: BarChart3, code: 'L-05' },
  ],
}

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  if (!user) return null

  const nav = roleNavs[user.role]

  return (
    <div className="app-shell">
      {/* Top Institutional Header */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="campus-pill">
            <span className="dot" /> GREEN CAMPUS UNKLAB
          </span>
          <span className="topbar-pipe">|</span>
          <span className="telemetry-status">Grid Telemetry Active (220.4V avg)</span>
        </div>

        {/* User & Role Status */}
        <div className="topbar-right">
          <button className="notif-bell" aria-label="Notifikasi Sistem" title="5 Insiden Aktif">
            <Bell size={16} />
            <span className="notif-dot" />
          </button>

          <div className="user-profile-widget">
            <div className="user-profile-copy">
              <div className="user-profile-name">{user.name}</div>
              <div className="user-profile-dept">Fakultas Ilmu Komputer</div>
            </div>
            <div className="user-avatar-badge" title={roleLabels[user.role]}>
              {initials(user.name)}
            </div>
          </div>

          <button
            className="logout-mini-btn"
            onClick={() => void logout()}
            aria-label="Keluar dari sistem"
            title="Keluar / Ganti Akun"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Secondary Horizontal Subnav Navigation */}
      <nav className="subnav" aria-label="Navigasi Telemetri Utama">
        <div className="subnav-tabs">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `subnav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={15} />
                <span>{item.label}</span>
                {item.code && <span className="subnav-badge">{item.code}</span>}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main">
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError, clearToken, getStoredUser, getToken, setStoredUser, setToken } from '../lib/api'
import type { AuthUser, Role } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const roleHome: Record<Role, string> = {
  ADMIN: '/dashboard',
  AUDITOR: '/audit',
  MAINTENANCE: '/panels',
  PIMPINAN: '/executive',
}

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Dosen Admin',
  AUDITOR: 'Auditor Lapangan',
  MAINTENANCE: 'Facility Maintenance',
  PIMPINAN: 'Pimpinan Kampus',
}

const MOCK_USERS: Record<string, AuthUser> = {
  'dosen.admin@unklab.ac.id': {
    id: 1,
    name: 'Dosen Admin',
    email: 'dosen.admin@unklab.ac.id',
    role: 'ADMIN',
    role_label: 'Dosen Admin',
    is_active: true,
  },
  'admin@unklab.ac.id': {
    id: 2,
    name: 'Dr. R. Palit (Koordinator)',
    email: 'admin@unklab.ac.id',
    role: 'ADMIN',
    role_label: 'Dosen Admin',
    is_active: true,
  },
  'auditor@unklab.ac.id': {
    id: 3,
    name: 'Mario K.',
    email: 'auditor@unklab.ac.id',
    role: 'AUDITOR',
    role_label: 'Auditor Lapangan',
    is_active: true,
  },
  'maintenance@unklab.ac.id': {
    id: 9,
    name: 'Randy S.',
    email: 'maintenance@unklab.ac.id',
    role: 'MAINTENANCE',
    role_label: 'Facility Maintenance',
    is_active: true,
  },
  'pimpinan@unklab.ac.id': {
    id: 13,
    name: 'Nadia Sondakh (WR II)',
    email: 'pimpinan@unklab.ac.id',
    role: 'PIMPINAN',
    role_label: 'Pimpinan Kampus',
    is_active: true,
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function restore() {
      const savedUser = getStoredUser()
      if (savedUser && active) {
        setUser(savedUser)
      }

      if (!getToken()) {
        if (active) setLoading(false)
        return
      }

      try {
        const response = await api.get<{ user: AuthUser }>('/me')
        if (active) {
          setUser(response.user)
          setStoredUser(response.user)
        }
      } catch {
        if (!getStoredUser()) {
          clearToken()
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void restore()

    const onUnauthorized = () => {
      clearToken()
      setUser(null)
    }
    window.addEventListener('vampir:unauthorized', onUnauthorized)

    return () => {
      active = false
      window.removeEventListener('vampir:unauthorized', onUnauthorized)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post<{ token: string; user: AuthUser }>('/login', {
        email,
        password,
        device_name: 'vampir-web',
      })
      setToken(response.token)
      setUser(response.user)
      setStoredUser(response.user)
      return response.user
    } catch (caught: unknown) {
      if (caught instanceof ApiError && caught.status < 500) {
        throw caught
      }
      // Offline/unreachable backend fallback: only when backend server is unreachable
      const lower = email.trim().toLowerCase()
      const role: Role = lower.includes('auditor')
        ? 'AUDITOR'
        : lower.includes('maint')
          ? 'MAINTENANCE'
          : lower.includes('pimpinan')
            ? 'PIMPINAN'
            : 'ADMIN'
      const fallbackUser: AuthUser = MOCK_USERS[lower] || {
        id: 1,
        name: lower.includes('auditor')
          ? 'Auditor Lapangan'
          : lower.includes('maint')
            ? 'Facility Maintenance'
            : lower.includes('pimpinan')
              ? 'Pimpinan Kampus'
              : 'Dosen Admin',
        email: email.trim(),
        role,
        role_label: roleLabels[role],
        is_active: true,
      }

      setToken('vampir-offline-token')
      setUser(fallbackUser)
      setStoredUser(fallbackUser)
      return fallbackUser
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } catch {
      // Token may already be invalid; local cleanup still applies.
    }
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider.')
  return context
}

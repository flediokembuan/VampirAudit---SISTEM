import {
  mockAudits,
  mockBills,
  mockDashboard,
  mockExecutive,
  mockIncidents,
  mockPanelOverview,
  mockProgressLabs,
  mockSpecs,
  mockUsers,
} from './mockData'
import type { AppUser, AuditLog, AuthUser, Incident, LabRoom, Parameters, Role, Spec } from '../types'

const TOKEN_KEY = 'vampir.token'
const USER_KEY = 'vampir.user'
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'
const CACHE_TTL_MS = 30_000

const responseCache = new Map<string, { data: unknown; timestamp: number }>()
const inflightRequests = new Map<string, Promise<unknown>>()
let cacheVersion = 0

export function clearApiCache(): void {
  cacheVersion += 1
  responseCache.clear()
  inflightRequests.clear()
}

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  clearApiCache()
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  clearApiCache()
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): AuthUser | null {
  const stored = localStorage.getItem(USER_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as AuthUser
  } catch {
    return null
  }
}

export function setStoredUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function firstError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.errors) {
      const first = Object.values(error.errors)[0]?.[0]
      if (first) return first
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Terjadi kesalahan yang tidak terduga.'
}

type RequestOptions = {
  method?: string
  body?: unknown
  signal?: AbortSignal
}

// In-memory mock states for offline/preview interactive experience
const localAudits: AuditLog[] = [...mockAudits]
const localIncidents: Incident[] = [...mockIncidents]
const localSpecs: Spec[] = [...mockSpecs]
const localLabs: LabRoom[] = mockProgressLabs.map((l) => ({
  id: l.id,
  name: l.name,
  location: l.location,
  capacity: l.capacity,
  standby_hours_per_day: null,
  standby_days_per_month: null,
  is_active: true,
  audited_count: l.audited_count,
}))
const localUsers: AppUser[] = Object.values(mockUsers).map((u) => ({ ...u }))
let localParameters: Parameters = { ...mockDashboard.parameters }

function isOfflineToken(token: string | null): boolean {
  return token === 'vampir-offline-token' || token === 'demo-token-session'
}

function handleMockFallback<T>(path: string, options: RequestOptions = {}): T {
  const urlPath = path.split('?')[0]
  const method = options.method ?? 'GET'

  if (urlPath === '/login' && method === 'POST') {
    const payload = options.body as { email?: string; password?: string }
    const email = (payload?.email ?? 'dosen.admin@unklab.ac.id').toLowerCase()
    const found = mockUsers[email] ?? {
      id: 99,
      name: email.split('@')[0],
      email,
      role: 'ADMIN' as Role,
      role_label: 'Dosen Admin',
      is_active: true,
    }
    setToken('demo-token-session')
    setStoredUser(found)
    return { token: 'demo-token-session', user: found } as T
  }

  if (urlPath === '/me') {
    const user = getStoredUser() ?? mockUsers['dosen.admin@unklab.ac.id']
    return { user } as T
  }

  if (urlPath === '/logout') {
    clearToken()
    return undefined as T
  }

  if (urlPath === '/dashboard') {
    return mockDashboard as T
  }

  if (urlPath === '/audits/progress') {
    return { data: mockProgressLabs } as T
  }

  if (urlPath === '/specs') {
    if (method === 'POST') {
      const body = options.body as Omit<Spec, 'id' | 'label'>
      const created: Spec = {
        id: Date.now(),
        ram_gb: body.ram_gb,
        storage_gb: body.storage_gb,
        storage_type: body.storage_type,
        cpu: body.cpu ?? null,
        label: `${body.ram_gb} GB RAM · ${body.storage_gb} GB ${body.storage_type}${body.cpu ? ` · ${body.cpu}` : ''}`,
        standby_watt: body.standby_watt,
        is_active: body.is_active ?? true,
      }
      localSpecs.push(created)
      return { data: created } as T
    }
    return { data: localSpecs } as T
  }

  if (urlPath.startsWith('/specs/')) {
    const id = Number(urlPath.split('/')[2])
    const idx = localSpecs.findIndex((s) => s.id === id)
    if (method === 'DELETE' && idx !== -1) {
      localSpecs.splice(idx, 1)
      return { message: 'Spesifikasi dihapus.' } as T
    }
    if (method === 'PATCH' && idx !== -1) {
      const body = options.body as Partial<Spec>
      const target = localSpecs[idx]
      const ram = body.ram_gb ?? target.ram_gb
      const storage = body.storage_gb ?? target.storage_gb
      const stype = body.storage_type ?? target.storage_type
      const cpu = body.cpu !== undefined ? body.cpu : target.cpu
      const updated: Spec = {
        ...target,
        ...body,
        label: `${ram} GB RAM · ${storage} GB ${stype}${cpu ? ` · ${cpu}` : ''}`,
      }
      localSpecs[idx] = updated
      return { data: updated } as T
    }
  }

  if (urlPath === '/audits') {
    if (method === 'POST') {
      const body = options.body as {
        lab_room_id: number
        pc_number: string
        master_pc_spec_id: number
        standby_watt_snapshot?: number
        is_faulty: boolean
        fault_note?: string | null
      }
      const spec = localSpecs.find((s) => s.id === body.master_pc_spec_id) ?? localSpecs[0]
      const newAudit: AuditLog = {
        id: Date.now(),
        lab_room_id: body.lab_room_id,
        lab_name: localLabs.find((l) => l.id === body.lab_room_id)?.name,
        pc_number: body.pc_number,
        master_pc_spec_id: body.master_pc_spec_id,
        spec: {
          ram_gb: spec.ram_gb,
          storage_gb: spec.storage_gb,
          storage_type: spec.storage_type,
          cpu: spec.cpu,
          standby_watt: body.standby_watt_snapshot ?? spec.standby_watt,
          label: spec.label,
        },
        is_faulty: body.is_faulty,
        fault_note: body.fault_note ?? null,
        auditor: { id: 2, name: 'Auditor Lapangan' },
        audited_at: new Date().toISOString(),
      }
      localAudits.unshift(newAudit)
      return { data: newAudit } as T
    }
    return { data: localAudits } as T
  }

  if (urlPath.startsWith('/audits/')) {
    const id = Number(urlPath.split('/')[2])
    const idx = localAudits.findIndex((a) => a.id === id)
    if (method === 'DELETE' && idx !== -1) {
      localAudits.splice(idx, 1)
      return { message: 'Catatan audit dihapus.' } as T
    }
    if (method === 'PATCH' && idx !== -1) {
      const body = options.body as {
        pc_number?: string
        master_pc_spec_id?: number
        standby_watt_snapshot?: number
        is_faulty?: boolean
        fault_note?: string | null
      }
      const existing = localAudits[idx]
      const spec = body.master_pc_spec_id
        ? localSpecs.find((s) => s.id === body.master_pc_spec_id) ?? localSpecs[0]
        : null
      const updated: AuditLog = {
        ...existing,
        pc_number: body.pc_number ?? existing.pc_number,
        master_pc_spec_id: body.master_pc_spec_id ?? existing.master_pc_spec_id,
        spec: spec
          ? {
              ram_gb: spec.ram_gb,
              storage_gb: spec.storage_gb,
              storage_type: spec.storage_type,
              cpu: spec.cpu,
              standby_watt: body.standby_watt_snapshot ?? spec.standby_watt,
              label: spec.label,
            }
          : {
              ...existing.spec,
              standby_watt: body.standby_watt_snapshot ?? existing.spec.standby_watt,
            },
        is_faulty: body.is_faulty ?? existing.is_faulty,
        fault_note: body.fault_note !== undefined ? body.fault_note : existing.fault_note,
      }
      localAudits[idx] = updated
      return { data: updated } as T
    }
  }

  if (urlPath === '/panel-limits') {
    return mockPanelOverview as T
  }

  if (urlPath === '/panel-readings' && method === 'POST') {
    const body = options.body as { lab_room_id: number; group_type: 'SOCKET' | 'AC'; load_watt: number; notes?: string | null }
    const lab = mockPanelOverview.labs.find((l) => l.id === body.lab_room_id)
    const panel = lab?.panels.find((p) => p.group_type === body.group_type)
    if (panel) {
      panel.load_watt = body.load_watt
      panel.percent = Math.round((body.load_watt / panel.limit_watt) * 1000) / 10
      panel.status = panel.percent > 100 ? 'OVER' : panel.percent >= panel.warning_percent ? 'WARNING' : 'NORMAL'
      panel.status_label = panel.status === 'OVER' ? 'Melampaui batas' : panel.status === 'WARNING' ? 'Mendekati batas' : 'Normal'
      panel.recorded_at = new Date().toISOString()
      panel.notes = body.notes ?? null

      const allPanels = mockPanelOverview.labs.flatMap((l) => l.panels)
      mockPanelOverview.warnings = allPanels.filter((p) => p.status === 'WARNING' || p.status === 'OVER')
      mockPanelOverview.summary.warnings = mockPanelOverview.warnings.length
    }
    return { data: body, status: panel } as T
  }

  if (urlPath === '/incidents') {
    if (method === 'POST') {
      const body = options.body as { lab_room_id: number; description: string }
      const nowStr = new Date().toISOString()
      const newInc: Incident = {
        id: Date.now(),
        lab_room_id: body.lab_room_id,
        lab_name: mockProgressLabs.find((l) => l.id === body.lab_room_id)?.name ?? 'Laboratorium',
        description: body.description,
        status: 'BARU',
        status_label: 'Baru',
        reporter: { id: 1, name: 'Dosen Admin' },
        status_updated_by: null,
        status_note: null,
        resolved_at: null,
        created_at: nowStr,
        updated_at: nowStr,
      }
      localIncidents.unshift(newInc)
      return { data: newInc } as T
    }
    return { data: localIncidents, server_time: new Date().toISOString() } as T
  }

  if (urlPath.startsWith('/incidents/') && urlPath.endsWith('/status')) {
    const id = Number(urlPath.split('/')[2])
    const body = options.body as { status: Incident['status']; note?: string }
    const target = localIncidents.find((i) => i.id === id)
    if (target) {
      target.status = body.status
      target.status_label = body.status === 'SELESAI' ? 'Selesai' : body.status === 'DITANGANI' ? 'Ditangani' : 'Baru'
      target.status_note = body.note ?? null
      target.resolved_at = body.status === 'SELESAI' ? new Date().toISOString() : null
      target.updated_at = new Date().toISOString()
      return { data: target } as T
    }
  }

  if (urlPath === '/reports/executive/summary') {
    return mockExecutive as T
  }

  if (urlPath === '/users') {
    if (method === 'POST') {
      const body = options.body as { name: string; email: string; role: Role; is_active?: boolean }
      const created: AppUser = {
        id: Date.now(),
        name: body.name,
        email: body.email.toLowerCase(),
        role: body.role,
        role_label: body.role,
        is_active: body.is_active ?? true,
      }
      localUsers.push(created)
      return { data: created } as T
    }
    return { data: localUsers, meta: { total: localUsers.length } } as T
  }

  if (urlPath.startsWith('/users/')) {
    const id = Number(urlPath.split('/')[2])
    const target = localUsers.find((u) => u.id === id)
    if (target) {
      if (method === 'DELETE') {
        target.is_active = false
        return { message: 'Akun dinonaktifkan.' } as T
      }
      if (method === 'PATCH') {
        const body = options.body as Partial<AppUser>
        Object.assign(target, body)
        return { data: target } as T
      }
    }
  }

  if (urlPath === '/labs') {
    return { data: localLabs } as T
  }

  if (urlPath.startsWith('/labs/') && method === 'PATCH') {
    const id = Number(urlPath.split('/')[2])
    const target = localLabs.find((l) => l.id === id)
    if (target) {
      Object.assign(target, options.body)
      return { data: target } as T
    }
  }

  if (urlPath === '/settings') {
    if (method === 'PATCH') {
      localParameters = { ...localParameters, ...(options.body as Partial<Parameters>) }
      return { message: 'Parameter berhasil diperbarui.', parameters: localParameters } as T
    }
    return { data: [], parameters: localParameters } as T
  }

  if (urlPath === '/settings/history') {
    return { data: [] } as T
  }

  if (urlPath === '/bills') {
    return { data: mockBills } as T
  }

  return {} as T
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()

  if (isOfflineToken(token) && path !== '/login') {
    return handleMockFallback<T>(path, options)
  }

  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })

    if (response.status === 204) return undefined as T

    const text = await response.text()
    let payload: unknown = null
    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        payload = null
      }
    }

    if (
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504 ||
      (response.status === 500 && payload === null)
    ) {
      return handleMockFallback<T>(path, options)
    }

    if (!response.ok) {
      const data = payload as { message?: string; errors?: Record<string, string[]> } | null
      if (response.status === 401 && path !== '/login') {
        clearToken()
        window.dispatchEvent(new Event('vampir:unauthorized'))
      }
      throw new ApiError(data?.message ?? 'Permintaan gagal diproses.', response.status, data?.errors)
    }

    return payload as T
  } catch (error) {
    // If backend server is not running (NetworkError / Failed to fetch), smoothly fallback to interactive mock data
    if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
      return handleMockFallback<T>(path, options)
    }
    throw error
  }
}

function toQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

type GetOptions = {
  fresh?: boolean
  signal?: AbortSignal
}

export const api = {
  get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined | null>,
    options?: GetOptions,
  ): Promise<T> {
    const fullPath = `${path}${toQuery(params)}`

    if (!options?.fresh) {
      const cached = responseCache.get(fullPath)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return Promise.resolve(structuredClone(cached.data) as T)
      }

      const existing = inflightRequests.get(fullPath)
      if (existing) {
        return existing.then((data) => structuredClone(data) as T)
      }
    }

    const requestVersion = cacheVersion
    const pending = request<T>(fullPath, { signal: options?.signal })
      .then((data) => {
        if (requestVersion === cacheVersion) {
          responseCache.set(fullPath, {
            data: structuredClone(data),
            timestamp: Date.now(),
          })
        }
        return data
      })
      .finally(() => {
        if (inflightRequests.get(fullPath) === pending) {
          inflightRequests.delete(fullPath)
        }
      })

    inflightRequests.set(fullPath, pending)
    return pending
  },
  async post<T>(path: string, body?: unknown): Promise<T> {
    const result = await request<T>(path, { method: 'POST', body })
    clearApiCache()
    return result
  },
  async patch<T>(path: string, body?: unknown): Promise<T> {
    const result = await request<T>(path, { method: 'PATCH', body })
    clearApiCache()
    return result
  },
  async delete<T>(path: string): Promise<T> {
    const result = await request<T>(path, { method: 'DELETE' })
    clearApiCache()
    return result
  },
}

export function prefetchRoleData(role: Role): void {
  const swallow = (promise: Promise<unknown>) => {
    void promise.catch(() => undefined)
  }

  if (role === 'ADMIN') {
    swallow(api.get('/dashboard'))
    swallow(api.get('/audits/progress'))
    swallow(api.get('/specs'))
    swallow(api.get('/panel-limits'))
    swallow(api.get('/audits', { lab_room_id: 1, per_page: 100 }))
    swallow(api.get('/incidents', { per_page: 100 }))
    swallow(api.get('/reports/executive/summary'))
    swallow(api.get('/audits', { per_page: 300 }))
    swallow(api.get('/specs', { include_inactive: 1 }))
    swallow(api.get('/labs', { include_inactive: 1 }))
    swallow(api.get('/users', { per_page: 100 }))
    swallow(api.get('/users'))
    swallow(api.get('/settings'))
    swallow(api.get('/settings/history'))
    swallow(api.get('/labs'))
    return
  }

  if (role === 'AUDITOR') {
    swallow(api.get('/dashboard'))
    swallow(api.get('/audits/progress'))
    swallow(api.get('/specs'))
    swallow(api.get('/panel-limits'))
    swallow(api.get('/audits', { lab_room_id: 1, per_page: 100 }))
    return
  }

  if (role === 'MAINTENANCE') {
    swallow(api.get('/panel-limits'))
    swallow(api.get('/incidents', { per_page: 100 }))
    return
  }

  if (role === 'PIMPINAN') {
    swallow(api.get('/reports/executive/summary'))
  }
}

export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    const response = await fetch(`${API_BASE}${path}`, { headers })

    if (!response.ok) {
      throw new Error('Gagal')
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fallbackName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  } catch {
    // Fallback download for preview demo
    const mockContent = `LAPORAN RESMI EKSEKUTIF AUDIT ENERGI LISTRIK VAMPIR\nUNIVERSITAS KLABAT (UNKLAB)\nTanggal Cetak: ${new Date().toLocaleDateString('id-ID')}\n\nStatus: 6 Laboratorium Komputer Terpantau\nEstimasi Pemborosan Daya Vampir: Rp 139.384,65 / bulan (96.48 kWh)\nEmisi Karbon: 75.25 kg CO2e / bulan\n`
    const blob = new Blob([mockContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fallbackName.replace('.pdf', '.txt')
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }
}

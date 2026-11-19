import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
  closing?: boolean
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)
  const timersRef = useRef<Map<number, number>>(new Map())
  const closingIdsRef = useRef<Set<number>>(new Set())

  const remove = useCallback((id: number) => {
    const timer = timersRef.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }
    closingIdsRef.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const dismiss = useCallback(
    (id: number) => {
      if (closingIdsRef.current.has(id)) return
      closingIdsRef.current.add(id)

      const existing = timersRef.current.get(id)
      if (existing !== undefined) {
        window.clearTimeout(existing)
        timersRef.current.delete(id)
      }

      setToasts((current) =>
        current.map((toast) => (toast.id === id ? { ...toast, closing: true } : toast)),
      )
      const exitTimer = window.setTimeout(() => remove(id), 400)
      timersRef.current.set(id, exitTimer)
    },
    [remove],
  )

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++counter.current
      setToasts((current) => [...current, { id, kind, message }])
      const timer = window.setTimeout(() => dismiss(id), 4800)
      timersRef.current.set(id, timer)
    },
    [dismiss],
  )

  useEffect(() => {
    const timers = timersRef.current
    const closingIds = closingIdsRef.current
    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer)
      }
      timers.clear()
      closingIds.clear()
    }
  }, [])

  const value = {
    push,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div
            className={`toast toast-${toast.kind}`}
            data-closing={toast.closing ? 'true' : undefined}
            key={toast.id}
          >
            <span className="toast-icon">
              {toast.kind === 'success' && <CheckCircle2 size={17} />}
              {toast.kind === 'error' && <TriangleAlert size={17} />}
              {toast.kind === 'info' && <Info size={17} />}
            </span>
            <span>{toast.message}</span>
            <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Tutup notifikasi">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast harus dipakai di dalam ToastProvider.')
  return context
}

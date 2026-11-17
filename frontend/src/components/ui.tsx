import { useEffect, useId, useRef, type ReactNode } from 'react'
import { AlertCircle, LoaderCircle, X } from 'lucide-react'

type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'accent'

export function Badge({
  tone = 'neutral',
  children,
  dot = false,
}: {
  tone?: BadgeTone
  children: ReactNode
  dot?: boolean
}) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  )
}

export function ProgressBar({
  value,
  tone = 'accent',
  height = 7,
}: {
  value: number
  tone?: 'accent' | 'success' | 'warning' | 'danger'
  height?: number
}) {
  const width = Math.min(Math.max(value, 0), 100)
  return (
    <div className="progress-track" style={{ height }}>
      <div className={`progress-fill progress-${tone}`} style={{ width: `${width}%` }} />
    </div>
  )
}

export function StatCard({
  icon,
  label,
  value,
  meta,
  tone = 'accent',
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  meta?: ReactNode
  tone?: 'accent' | 'blue' | 'amber' | 'red'
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-icon-${tone}`}>{icon}</div>
      <div className="stat-copy">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {meta && <div className="stat-meta">{meta}</div>}
      </div>
    </article>
  )
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleClose = () => {
      if (open) onClose()
    }
    dialog.addEventListener('close', handleClose)

    // Fallback for browsers without <dialog closedby="any">
    let cleanupFallback: (() => void) | undefined
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false
      const isOutside = (event: PointerEvent) => {
        const rect = dialog.getBoundingClientRect()
        return (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
      }
      const onPointerDown = (event: PointerEvent) => {
        pressedOutside = isOutside(event)
      }
      const onPointerUp = (event: PointerEvent) => {
        if (pressedOutside && isOutside(event)) {
          dialog.close()
        }
        pressedOutside = false
      }
      dialog.addEventListener('pointerdown', onPointerDown)
      dialog.addEventListener('pointerup', onPointerUp)
      cleanupFallback = () => {
        dialog.removeEventListener('pointerdown', onPointerDown)
        dialog.removeEventListener('pointerup', onPointerUp)
      }
    }

    return () => {
      dialog.removeEventListener('close', handleClose)
      cleanupFallback?.()
    }
  }, [open, onClose])

  return (
    <dialog
      ref={dialogRef}
      className={`modal ${wide ? 'modal-wide' : ''}`}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      {open && (
        <>
          <header className="modal-head">
            <div>
              <h2 id={titleId} className="modal-title">{title}</h2>
              {subtitle && <p className="modal-sub">{subtitle}</p>}
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup dialog">
              <X size={17} />
            </button>
          </header>
          <div className="modal-body">{children}</div>
          {footer && <footer className="modal-foot">{footer}</footer>}
        </>
      )}
    </dialog>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

export function PageLoader({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div className="page-loader">
      <LoaderCircle className="spin" size={22} />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-state">
      <AlertCircle size={22} />
      <div>
        <strong>Data tidak dapat dimuat</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  )
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className = '',
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`field ${className}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <span className="field-error">{error}</span>}
      {hint && !error && <span className="field-hint">{hint}</span>}
    </div>
  )
}

export function PageHead({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </header>
  )
}

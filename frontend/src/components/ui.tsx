import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, LoaderCircle, X } from 'lucide-react'

type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'accent'

let supportsDisplayTransition: boolean | undefined

function canTransitionDisplay(): boolean {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition
  if (typeof window === 'undefined' || !window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
    return false
  }
  const probe = document.createElement('div')
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;'
  document.body.appendChild(probe)
  void getComputedStyle(probe).display
  probe.style.display = 'none'
  supportsDisplayTransition = getComputedStyle(probe).display === 'block'
  probe.remove()
  return supportsDisplayTransition
}

function supportsTopLayerExit(): boolean {
  return Boolean(typeof window !== 'undefined' && window.CSS?.supports?.('overlay', 'auto') && canTransitionDisplay())
}

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
  const ratio = Math.min(Math.max(value, 0), 100) / 100
  return (
    <div className="progress-track" style={{ height }}>
      <div className={`progress-fill progress-${tone}`} style={{ transform: `scaleX(${ratio})` }} />
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
  const [shouldRender, setShouldRender] = useState(open)
  const openRef = useRef(open)

  useEffect(() => {
    openRef.current = open
  }, [open])

  if (open && !shouldRender) {
    setShouldRender(true)
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      dialog.removeAttribute('data-closing')
      if (!dialog.open) dialog.showModal()
      return
    }

    if (!dialog.open) {
      if (!shouldRender) return
      const timer = window.setTimeout(() => setShouldRender(false), 260)
      return () => window.clearTimeout(timer)
    }

    if (supportsTopLayerExit()) {
      dialog.close()
      const timer = window.setTimeout(() => setShouldRender(false), 260)
      return () => window.clearTimeout(timer)
    }

    let cancelled = false
    dialog.setAttribute('data-closing', '')
    const animations = dialog.getAnimations({ subtree: true })
    const finishClose = () => {
      if (cancelled || openRef.current) return
      if (dialog.hasAttribute('data-closing')) {
        dialog.removeAttribute('data-closing')
        if (dialog.open) dialog.close()
      }
      setShouldRender(false)
    }

    if (animations.length === 0) {
      const timer = window.setTimeout(finishClose, 0)
      return () => {
        cancelled = true
        window.clearTimeout(timer)
      }
    }

    let timer: number | undefined
    void Promise.race([
      Promise.allSettled(animations.map((anim) => anim.finished)),
      new Promise<void>((resolve) => {
        timer = window.setTimeout(resolve, 400)
      }),
    ]).then(finishClose)

    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [open, shouldRender])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleCancel = (event: Event) => {
      if (!supportsTopLayerExit()) {
        event.preventDefault()
        if (open) onClose()
      }
    }

    const handleClose = () => {
      if (open) onClose()
    }

    dialog.addEventListener('cancel', handleCancel)
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
        if (pressedOutside && isOutside(event) && open) {
          onClose()
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
      dialog.removeEventListener('cancel', handleCancel)
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
      {shouldRender && (
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

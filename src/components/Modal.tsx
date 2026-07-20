// 汎用ボトムシート型Modal。フォーカス、Escape、背景抑止を共通管理する。
import { useEffect, useId, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
}

const modalStack: symbol[] = []
let bodyLockCount = 0
let previousBodyOverflow = ''
let lastTrigger: HTMLElement | null = null

if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('button,a[href],[role="button"],[tabindex]')
        : null
      if (target) lastTrigger = target
    },
    true,
  )
}

const focusableSelector = [
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function isTopModal(id: symbol): boolean {
  return modalStack[modalStack.length - 1] === id
}

export default function Modal({ open, onClose, title, description, children }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const stackId = useRef(Symbol('modal'))
  const reactId = useId().replace(/:/g, '')
  const titleId = `modal-title-${reactId}`
  const descriptionId = `modal-description-${reactId}`

  useEffect(() => {
    if (!open) return
    const id = stackId.current
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    openerRef.current = active && active !== document.body ? active : lastTrigger
    modalStack.push(id)

    if (bodyLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      document.body.classList.add('modal-open')
    }
    bodyLockCount += 1

    const dialog = dialogRef.current
    const initial = dialog?.querySelector<HTMLElement>(`[data-autofocus],${focusableSelector}`)
    ;(initial ?? dialog)?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopModal(id)) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)]
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      const index = modalStack.lastIndexOf(id)
      if (index >= 0) modalStack.splice(index, 1)
      bodyLockCount = Math.max(0, bodyLockCount - 1)
      if (bodyLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow
        document.body.classList.remove('modal-open')
      }
      openerRef.current?.focus()
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="modal-overlay open"
      onClick={(event) => {
        if (event.target === event.currentTarget && isTopModal(stackId.current)) onClose()
      }}
      data-backdrop-close="true"
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <div className="modal-title" id={titleId}>
          {title}
        </div>
        <div className="sr-only" id={descriptionId}>
          {description ?? `${title}の入力画面です。`}
        </div>
        {children}
      </div>
    </div>
  )
}

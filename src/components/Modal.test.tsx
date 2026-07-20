// @vitest-environment jsdom
import { act, useCallback, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Modal from './Modal'

let root: Root | null = null
let container: HTMLDivElement | null = null

function render(ui: React.ReactNode) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(ui))
}

function SingleModal() {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  return (
    <>
      <button id="opener" onClick={() => setOpen(true)}>開く</button>
      <Modal open={open} onClose={close} title="テスト" description="説明文">
        <input data-autofocus aria-label="内容" />
        <button>保存</button>
        <button>キャンセル</button>
      </Modal>
    </>
  )
}

function openSingleModal() {
  render(<SingleModal />)
  const opener = container?.querySelector<HTMLButtonElement>('#opener')
  act(() => opener?.click())
  return opener!
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  document.body.style.overflow = ''
  document.body.classList.remove('modal-open')
})

describe('Modal', () => {
  it('dialog roleと関連するaria属性を持つ', () => {
    openSingleModal()
    const dialog = container?.querySelector<HTMLElement>('[role="dialog"]')
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(dialog!.getAttribute('aria-labelledby')!)?.textContent).toBe('テスト')
    expect(document.getElementById(dialog!.getAttribute('aria-describedby')!)?.textContent).toBe('説明文')
  })

  it('開いた直後に最初の入力へフォーカスする', () => {
    openSingleModal()
    expect(document.activeElement).toBe(container?.querySelector('input'))
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('TabとShift+Tabをdialog内へ閉じ込める', () => {
    openSingleModal()
    const input = container?.querySelector<HTMLInputElement>('input')
    const buttons = container?.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')
    const last = buttons?.[buttons.length - 1]

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })))
    expect(document.activeElement).toBe(last)
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })))
    expect(document.activeElement).toBe(input)
  })

  it('Escapeで閉じ、開いたボタンへフォーカスを戻す', () => {
    const opener = openSingleModal()
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(container?.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('積み重なった場合はEscapeで手前だけを閉じる', () => {
    function Stacked() {
      const [back, setBack] = useState(true)
      const [front, setFront] = useState(true)
      const closeBack = useCallback(() => setBack(false), [])
      const closeFront = useCallback(() => setFront(false), [])
      return (
        <>
          <Modal open={back} onClose={closeBack} title="背後"><button>背後の操作</button></Modal>
          <Modal open={front} onClose={closeFront} title="手前"><button>手前の操作</button></Modal>
        </>
      )
    }
    render(<Stacked />)

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    const dialogs = container?.querySelectorAll('[role="dialog"]')
    expect(dialogs).toHaveLength(1)
    expect(dialogs?.[0].textContent).toContain('背後')
  })

  it('dialog内部のクリックでは閉じず、背景クリックでは閉じる', () => {
    openSingleModal()
    const dialog = container?.querySelector<HTMLElement>('[role="dialog"]')
    act(() => dialog?.click())
    expect(container?.querySelector('[role="dialog"]')).not.toBeNull()
    const overlay = container?.querySelector<HTMLElement>('.modal-overlay')
    act(() => overlay?.click())
    expect(container?.querySelector('[role="dialog"]')).toBeNull()
  })
})

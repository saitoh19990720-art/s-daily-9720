// @vitest-environment jsdom
import { StrictMode, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PlanModal from '../components/PlanModal'
import { AppProvider, STORAGE_FAILURE_MESSAGE, useApp } from './AppContext'

type AppApi = ReturnType<typeof useApp>

let root: Root | null = null
let container: HTMLDivElement | null = null
let app: AppApi

function Probe({ withPlanModal = false }: { withPlanModal?: boolean }) {
  app = useApp()
  return (
    <>
      <div data-testid="toast">{app.toast}</div>
      {withPlanModal && <PlanModal />}
    </>
  )
}

function renderProbe(ui: React.ReactNode) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(ui))
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  act(() => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  })
  localStorage.clear()
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('AppProviderの保存境界', () => {
  it('StrictModeでも会話のかけらを重複保存せず、正しいトーストを出す', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    renderProbe(
      <StrictMode>
        <AppProvider>
          <Probe />
        </AppProvider>
      </StrictMode>,
    )

    act(() => app.sendChat('この内容をメモに残して'))
    act(() => vi.advanceTimersByTime(601))
    act(() => vi.advanceTimersByTime(301))
    const candidate = app.chatItems.find((item) => item.kind === 'ext')
    expect(candidate?.kind).toBe('ext')

    act(() => {
      app.saveCandidate(candidate!.id)
      app.saveCandidate(candidate!.id)
    })

    expect(app.memos).toHaveLength(1)
    expect(app.memos[0].text).toBe('会話メモ')
    expect(app.toast).toBe('会話のかけらに残しました')
  })

  it('保存失敗時に入力と画面stateを保持し、再試行できる', () => {
    vi.useFakeTimers()
    const originalSetItem = Storage.prototype.setItem
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, key, value) {
        if (key === 'planItems') throw new DOMException('Quota exceeded', 'QuotaExceededError')
        return originalSetItem.call(this, key, value)
      })
    renderProbe(
      <AppProvider>
        <Probe withPlanModal />
      </AppProvider>,
    )

    act(() => app.openPlanModal())
    const input = container?.querySelector<HTMLInputElement>('input[type="text"]')
    expect(input).not.toBeNull()
    setInputValue(input!, '病院へ行く')
    const saveButton = [...(container?.querySelectorAll<HTMLButtonElement>('.modal-acts button') ?? [])]
      .find((button) => button.textContent === '保存')
    act(() => saveButton?.click())

    expect(input?.value).toBe('病院へ行く')
    expect(container?.querySelector('.modal-overlay.open')).not.toBeNull()
    expect(app.planItems).toEqual([])
    expect(localStorage.getItem('planItems')).toBeNull()
    expect(app.toast).toBe(STORAGE_FAILURE_MESSAGE)

    setItemSpy.mockImplementation(function (this: Storage, key, value) {
      return originalSetItem.call(this, key, value)
    })
    act(() => saveButton?.click())
    expect(container?.querySelector('.modal-overlay.open')).toBeNull()
    expect(app.planItems).toEqual([{ text: '病院へ行く', time: '', cat: 'fun' }])
  })
})

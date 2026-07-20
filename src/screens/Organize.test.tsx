// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { AppProvider } from '../state/AppContext'

let root: Root | null = null
let container: HTMLDivElement | null = null

function renderApp(hash = '#/home') {
  window.history.replaceState(null, '', hash)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(<AppProvider><App /></AppProvider>))
}

function button(label: string): HTMLButtonElement {
  const match = [...(container?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
    .find((item) => item.textContent?.trim() === label)
  if (!match) throw new Error(`button not found: ${label}`)
  return match
}

function setFormValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  act(() => {
    setter?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  })
  localStorage.clear()
  localStorage.setItem('obdone', '1')
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  document.body.style.overflow = ''
  document.body.classList.remove('modal-open')
  vi.restoreAllMocks()
})

describe('Figma v2.1の5タブと整理画面', () => {
  it('下部ナビを5項目にし、整理内をタスク・かけら・予定の順で切り替える', () => {
    renderApp()
    const navLabels = [...container!.querySelectorAll('.bnav .nb-label')].map((item) => item.textContent)
    expect(navLabels).toEqual(['ホーム', 'チャット', '整理', '体調', '設定'])

    act(() => button('整理').click())
    expect(window.location.hash).toBe('#/organize/tasks')
    const tabs = [...container!.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    expect(tabs.map((tab) => tab.textContent)).toEqual(['タスク', 'かけら', '予定'])
    expect(tabs.every((tab) => tab.getAttribute('aria-controls') === 'organize-panel')).toBe(true)
    expect(container!.querySelector('#organize-panel')?.getAttribute('role')).toBe('tabpanel')

    act(() => button('かけら').click())
    expect(window.location.hash).toBe('#/organize/fragments')
    expect(button('かけら').getAttribute('aria-selected')).toBe('true')
    act(() => button('かけら').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
    expect(window.location.hash).toBe('#/organize/schedule')
    expect(button('予定').getAttribute('aria-selected')).toBe('true')

  })

  it('旧画面URLを対応する整理タブへ安全に読み替える', () => {
    renderApp('#/memo')
    expect(window.location.hash).toBe('#/organize/fragments')
    expect(button('かけら').getAttribute('aria-selected')).toBe('true')

    act(() => {
      window.location.hash = '#/planlist'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(window.location.hash).toBe('#/organize/schedule')
    expect(button('予定').getAttribute('aria-selected')).toBe('true')
  })

  it('タスク追加・編集・完了を整理内から操作できる', () => {
    renderApp('#/organize/tasks')
    act(() => button('＋ 新しくタスクを追加').click())
    const input = container!.querySelector<HTMLInputElement>('[role="dialog"] input[type="text"]')!
    setFormValue(input, '買い物に行く')
    act(() => button('保存').click())
    expect(container?.textContent).toContain('買い物に行く')

    const complete = container!.querySelector<HTMLButtonElement>('[aria-label="買い物に行くを完了にする"]')!
    act(() => complete.click())
    expect(container!.querySelector('.ti.done')).not.toBeNull()

    const edit = container!.querySelector<HTMLButtonElement>('[aria-label="買い物に行くを編集"]')!
    act(() => edit.click())
    const editInput = container!.querySelector<HTMLInputElement>('[role="dialog"] input[type="text"]')!
    setFormValue(editInput, '本を買いに行く')
    act(() => button('保存').click())
    expect(container?.textContent).toContain('本を買いに行く')
  })

  it('会話のかけらは利用者が保存ボタンを押した後だけ表示する', () => {
    renderApp('#/organize/fragments')
    expect(container?.textContent).toContain('まだ残した会話のかけらはありません')
    act(() => container!.querySelector<HTMLButtonElement>('[aria-label="会話のかけらに残す"]')!.click())
    const textarea = container!.querySelector<HTMLTextAreaElement>('[role="dialog"] textarea')!
    setFormValue(textarea, '残しておきたい会話')
    expect(container?.querySelector('.organize-fragment-card')).toBeNull()
    act(() => button('会話のかけらに残す').click())
    expect(container?.textContent).toContain('残しておきたい会話')
    expect(container?.querySelector('[role="status"]')?.textContent).toBe('会話のかけらに残しました')
  })

  it('予定を追加・編集し、既存planItems形式のまま保存する', () => {
    renderApp('#/organize/schedule')
    act(() => button('＋ 新しい予定を追加').click())
    const input = container!.querySelector<HTMLInputElement>('[role="dialog"] input[type="text"]')!
    setFormValue(input, 'オンライン勉強会')
    act(() => button('保存').click())
    expect(container?.textContent).toContain('オンライン勉強会')

    act(() => container!.querySelector<HTMLButtonElement>('[aria-label="オンライン勉強会を編集"]')!.click())
    const editInput = container!.querySelector<HTMLInputElement>('[role="dialog"] input[type="text"]')!
    setFormValue(editInput, '読書会')
    act(() => button('保存').click())
    expect(container?.textContent).toContain('読書会')
    expect(JSON.parse(localStorage.getItem('planItems') ?? '[]')).toEqual([
      { text: '読書会', time: '', cat: 'fun' },
    ])
  })
})

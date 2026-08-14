// @vitest-environment jsdom
// v2.1ホーム（Figma home-normal / node 112:1758）の表示条件。
// ・「今日やること」は期限が今日のタスクだけ（完了済みもその日中は残す）
// ・ホームのタスクカードは「チェック＋本文」（編集/削除は出さない）
// ・編集/削除の機能自体は整理画面に残っている
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { AppProvider } from '../state/AppContext'
import { tokyoDateInputValue } from '../lib/date'
import { TODO_SCHEMA_VERSION } from '../lib/repository'
import type { Todo } from '../lib/types'

let root: Root | null = null
let container: HTMLDivElement | null = null

const TODAY = tokyoDateInputValue()
const TOMORROW = tokyoDateInputValue(new Date(), 1)
const YESTERDAY = tokyoDateInputValue(new Date(), -1)

const todo = (id: string, text: string, due: string, done = false): Todo => ({
  id,
  text,
  done,
  due,
  prio: 'high',
  createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z',
})

function seedTodos(records: Todo[]) {
  localStorage.setItem(
    'oshi-os:v1:todos',
    JSON.stringify({ schemaVersion: TODO_SCHEMA_VERSION, records }),
  )
}

function renderApp(hash = '#/home') {
  window.history.replaceState(null, '', hash)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(<AppProvider><App /></AppProvider>))
}

function taskTexts(): string[] {
  return [...(container?.querySelectorAll('.ti .ti-text') ?? [])].map(
    (item) => item.textContent?.trim() ?? '',
  )
}

function button(label: string): HTMLButtonElement {
  const match = [...(container?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
    .find((item) => item.textContent?.trim() === label)
  if (!match) throw new Error(`button not found: ${label}`)
  return match
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
  vi.restoreAllMocks()
})

describe('v2.1ホームの「今日やること」', () => {
  it('期限が今日のタスクだけを出す（完了済みも残す。昨日以前・明日以降・期限なしは出さない）', () => {
    seedTodos([
      todo('t1', '今日のタスク', TODAY),
      todo('t2', '今日の完了済み', TODAY, true),
      todo('t3', '昨日のタスク', YESTERDAY),
      todo('t4', '明日のタスク', TOMORROW),
      todo('t5', '期限なしのタスク', ''),
    ])
    renderApp()
    expect(taskTexts()).toEqual(['今日のタスク', '今日の完了済み'])
  })

  it('今日の完了済みはチェック済み・取り消し線で残る（カードは消えない）', () => {
    seedTodos([todo('t1', '今日の完了済み', TODAY, true)])
    renderApp()
    const card = container?.querySelector('.ti')
    expect(card).not.toBeNull()
    expect(card?.classList.contains('done')).toBe(true)
    expect(card?.querySelector('.tck')?.getAttribute('aria-pressed')).toBe('true')
  })

  it('完了済みのチェックを外すと未完了へ戻る', () => {
    seedTodos([todo('t1', '今日の完了済み', TODAY, true)])
    renderApp()
    const check = container?.querySelector<HTMLButtonElement>('.ti .tck')
    act(() => check?.click())
    const card = container?.querySelector('.ti')
    expect(card?.classList.contains('done')).toBe(false)
    expect(card?.querySelector('.tck')?.getAttribute('aria-pressed')).toBe('false')
    expect(taskTexts()).toEqual(['今日の完了済み'])
  })

  it('今日のタスクが無いときは空状態を出す', () => {
    seedTodos([todo('t2', '明日のタスク', TOMORROW)])
    renderApp()
    expect(taskTexts()).toEqual([])
    expect(container?.querySelector('.empty')?.textContent).toContain('タスクは「整理」から')
  })

  it('ホームのタスクカードはチェック＋本文で、編集/削除ボタンを出さない', () => {
    seedTodos([todo('t1', '今日のタスク', TODAY)])
    renderApp()
    const card = container?.querySelector('.ti')
    expect(card?.querySelector('.tck')).not.toBeNull()
    expect(card?.querySelector('.ti-text')?.textContent).toBe('今日のタスク')
    expect(card?.querySelector('.ti-prio')?.textContent).toBe('⚠️ 優先度: 高')
    expect(card?.querySelectorAll('.btn-icon').length).toBe(0)
    expect(card?.querySelector('.prio-dot')).toBeNull()
  })

  it('編集・削除は整理画面（既存の利用箇所）に残っている', () => {
    seedTodos([todo('t1', '今日のタスク', TODAY)])
    renderApp()
    act(() => button('整理').click())
    const card = container?.querySelector('.ti')
    expect(card?.querySelectorAll('.btn-icon').length).toBe(2)
    expect(card?.querySelector('.prio-dot')).not.toBeNull()
    expect(card?.querySelector('.ti-prio')).toBeNull()
  })
})

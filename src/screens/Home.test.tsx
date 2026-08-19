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
  vi.useRealTimers()
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

  // 東京の日付が変わったとき、開きっぱなしのホームが前日のまま残らないこと（PR #2 P2）。
  it('ホームを開いたまま東京の0時を越えると、今日のタスクが新しい日のものへ入れ替わる', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-16T14:50:00Z')) // 2026-08-16 23:50 JST
    seedTodos([
      todo('t1', '16日のタスク', '2026-08-16'),
      todo('t2', '17日のタスク', '2026-08-17'),
    ])
    renderApp()
    expect(taskTexts()).toEqual(['16日のタスク'])

    act(() => {
      vi.advanceTimersByTime(11 * 60 * 1000) // 2026-08-17 00:01 JST
    })
    expect(taskTexts()).toEqual(['17日のタスク'])
  })

  it('バックグラウンドから復帰したとき（visibilitychange）に今日を取り直す', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-16T03:00:00Z')) // 2026-08-16 12:00 JST
    seedTodos([
      todo('t1', '16日のタスク', '2026-08-16'),
      todo('t2', '17日のタスク', '2026-08-17'),
    ])
    renderApp()
    expect(taskTexts()).toEqual(['16日のタスク'])

    // タイマーを進めずに日付だけ翌日へ（＝スリープ中にタイマーが遅延した状況）。
    vi.setSystemTime(new Date('2026-08-17T03:00:00Z')) // 2026-08-17 12:00 JST
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(taskTexts()).toEqual(['17日のタスク'])
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

// Figma正本 node 170:2（home-normal — alarm scheduled）に対応。
describe('v2.1ホームのアラームカード', () => {
  const alarmToggle = () =>
    container!.querySelector<HTMLInputElement>('.v21-alarm-section input[type="checkbox"]')!

  it('挨拶エリアの直下、「今日やること」の直前に置かれる', () => {
    renderApp()
    const order = [...container!.querySelectorAll('.scroll > *')].map((el) => el.className)
    expect(order).toEqual(['v21-greeting', 'v21-alarm-section', 'v21-agenda'])
    // 「今日やること」より前に出ていること
    const sections = container!.querySelector('.scroll')!
    const alarmIdx = [...sections.children].findIndex((el) => el.className === 'v21-alarm-section')
    const agendaIdx = [...sections.children].findIndex((el) => el.className === 'v21-agenda')
    expect(alarmIdx).toBeLessThan(agendaIdx)
  })

  it('scheduled状態でFigma既定の時刻・ラベルを出す', () => {
    renderApp()
    const card = container!.querySelector('.v21-alarm-section .alarm-card')!
    expect(card.getAttribute('data-state')).toBe('scheduled')
    expect(card.querySelector('.alarm-time')?.textContent).toBe('22:50')
    expect(card.textContent).toContain('夜タスクを始める')
    expect(card.querySelector('.alarm-status')?.textContent).toBe('予定')
  })

  it('ON/OFFを切り替えると保存され、開き直しても保持される', () => {
    renderApp()
    expect(alarmToggle().checked).toBe(true)

    act(() => alarmToggle().click())
    expect(alarmToggle().checked).toBe(false)

    // 開き直す（localStorageから読み直す）
    act(() => root?.unmount())
    container?.remove()
    renderApp()
    expect(alarmToggle().checked).toBe(false)
  })
})

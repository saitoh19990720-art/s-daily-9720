// @vitest-environment jsdom
import { StrictMode, act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PlanConvertModal from './PlanConvertModal'
import { AppProvider, STORAGE_FAILURE_MESSAGE, useApp } from '../state/AppContext'
import type { Memo } from '../lib/types'

type AppApi = ReturnType<typeof useApp>

let root: Root | null = null
let container: HTMLDivElement | null = null
let app: AppApi

const MEMO: Memo = {
  id: 'r-seed',
  text: '  配信を見る\n  今夜 ',
  date: '07/21',
  createdAt: '2026-07-21T00:00:00.000Z',
  updatedAt: '2026-07-21T00:00:00.000Z',
  source: 'chat',
  origin: [
    { role: 'user', content: '今夜配信ある' },
    { role: 'oshi', content: '楽しみだね' },
  ],
  tags: ['推し活'],
  schemaVersion: 1,
}

function Probe({ memo = MEMO }: { memo?: Memo }) {
  app = useApp()
  const [open, setOpen] = useState(true)
  return <PlanConvertModal open={open} memo={memo} onClose={() => setOpen(false)} />
}

function render(strict = false) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const tree = (
    <AppProvider>
      <Probe />
    </AppProvider>
  )
  act(() => root?.render(strict ? <StrictMode>{tree}</StrictMode> : tree))
}

function nameInput() {
  return container!.querySelector<HTMLInputElement>('#plan-name-input')!
}
function timeInput() {
  return container!.querySelector<HTMLInputElement>('#plan-time-input')!
}
function addButton() {
  return [...container!.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === '予定を追加')!
}
function byText(label: string) {
  return [...container!.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === label)
}
function setValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  act(() => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
function readPlans() {
  return JSON.parse(localStorage.getItem('planItems') ?? '[]')
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
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

describe('PlanConvertModal（③-B-3-2）', () => {
  it('かけら本文から予定名の初期値が入り、時間は空・カテゴリは楽しみ既定', () => {
    render()
    expect(nameInput().value).toBe('配信を見る 今夜') // deriveTaskName 再利用
    expect(timeInput().value).toBe('')
    const funBtn = [...container!.querySelectorAll<HTMLButtonElement>('.cat-btn')].find((b) =>
      b.textContent?.includes('楽しみ'),
    )!
    expect(funBtn.getAttribute('aria-pressed')).toBe('true')
  })

  it('予定名・時間・カテゴリを編集できる', () => {
    render()
    setValue(nameInput(), 'ライブ配信')
    setValue(timeInput(), '19:00')
    act(() => [...container!.querySelectorAll<HTMLButtonElement>('.cat-btn')].find((b) => b.textContent?.includes('必要'))!.click())
    expect(nameInput().value).toBe('ライブ配信')
    expect(timeInput().value).toBe('19:00')
  })

  it('空白だけの予定名では追加できない（ボタン無効・保存されない）', () => {
    render()
    setValue(nameInput(), '   ')
    expect(addButton().disabled).toBe(true)
    expect(app.planItems).toHaveLength(0)
  })

  it('明示追加でだけ予定を1件追加し、時間はずれず保存・250ms吸収後に閉じる', () => {
    vi.useFakeTimers()
    render()
    expect(app.planItems).toHaveLength(0)
    setValue(nameInput(), 'ライブ配信')
    setValue(timeInput(), '19:00')
    act(() => addButton().click())

    expect(app.planItems).toEqual([{ text: 'ライブ配信', time: '19:00', cat: 'fun' }])
    expect(app.toast).toBe('予定に追加しました')
    // 永続化（既存planItems形式＝素の配列・時間はそのまま）
    expect(readPlans()).toEqual([{ text: 'ライブ配信', time: '19:00', cat: 'fun' }])

    // 吸収中：まだ閉じない。Escapeで破棄確認も出ない（保存済み）。背後へ抜けない。
    expect(container!.querySelector('#plan-name-input')).not.toBeNull()
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(container!.textContent).not.toContain('入力内容を破棄しますか？')
    act(() => vi.advanceTimersByTime(251))
    expect(container!.querySelector('#plan-name-input')).toBeNull()
  })

  it('保存失敗時は入力・Modal・stateを保持し成功通知を出さず、再試行できる', () => {
    const originalSetItem = Storage.prototype.setItem
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'planItems') throw new DOMException('Quota exceeded', 'QuotaExceededError')
      return originalSetItem.call(this, key, value)
    })
    render()
    setValue(nameInput(), 'ライブ配信')
    act(() => addButton().click())

    expect(app.planItems).toHaveLength(0)
    expect(nameInput().value).toBe('ライブ配信') // 入力保持・Modal維持
    expect(app.toast).toBe(STORAGE_FAILURE_MESSAGE)

    spy.mockImplementation(function (this: Storage, key, value) {
      return originalSetItem.call(this, key, value)
    })
    act(() => addButton().click())
    expect(app.planItems).toHaveLength(1)
  })

  it('連打しても重複作成しない（吸収中は前面維持）', () => {
    vi.useFakeTimers()
    render()
    setValue(nameInput(), 'ライブ配信')
    act(() => {
      addButton().click()
      addButton().click()
    })
    expect(app.planItems).toHaveLength(1)
    expect(container!.querySelector('#plan-name-input')).not.toBeNull()
    act(() => vi.advanceTimersByTime(251))
    expect(container!.querySelector('#plan-name-input')).toBeNull()
  })

  it('StrictModeでも重複作成しない', () => {
    render(true)
    setValue(nameInput(), 'ライブ配信')
    act(() => addButton().click())
    expect(app.planItems).toHaveLength(1)
  })

  it('変更がなければ破棄確認なしで閉じる', () => {
    render()
    act(() => byText('キャンセル')!.click())
    expect(container!.textContent).not.toContain('入力内容を破棄しますか？')
    expect(container!.querySelector('#plan-name-input')).toBeNull()
  })

  it('未保存変更（時間やカテゴリ含む）があるとキャンセルで破棄確認し、編集継続で入力保持・破棄で閉じる', () => {
    render()
    setValue(timeInput(), '20:00') // 時間だけ変えても dirty
    act(() => byText('キャンセル')!.click())
    expect(container!.textContent).toContain('入力内容を破棄しますか？')

    act(() => byText('編集を続ける')!.click())
    expect(timeInput().value).toBe('20:00') // 全入力保持

    act(() => byText('キャンセル')!.click())
    act(() => byText('破棄する')!.click())
    expect(container!.querySelector('#plan-name-input')).toBeNull()
    expect(app.planItems).toHaveLength(0) // 破棄で保存しない
  })
})

// @vitest-environment jsdom
import { StrictMode, act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TaskConvertModal from './TaskConvertModal'
import { AppProvider, STORAGE_FAILURE_MESSAGE, useApp } from '../state/AppContext'
import { TASK_NAME_MAX, deriveTaskName } from '../lib/taskName'
import type { Memo } from '../lib/types'

type AppApi = ReturnType<typeof useApp>

let root: Root | null = null
let container: HTMLDivElement | null = null
let app: AppApi

const MEMO: Memo = {
  id: 'r-seed',
  text: '  クライアントへ返信する\n  今日中に ',
  date: '07/21',
  createdAt: '2026-07-21T00:00:00.000Z',
  updatedAt: '2026-07-21T00:00:00.000Z',
  source: 'chat',
  origin: [
    { role: 'user', content: '返信まだ' },
    { role: 'oshi', content: 'いっしょにやろ' },
  ],
  tags: ['仕事'],
  schemaVersion: 1,
}

function Probe({ memo = MEMO }: { memo?: Memo }) {
  app = useApp()
  const [open, setOpen] = useState(true)
  return <TaskConvertModal open={open} memo={memo} onClose={() => setOpen(false)} />
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
  return container!.querySelector<HTMLInputElement>('#task-name-input')!
}
function addButton() {
  return [...container!.querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent === 'タスクを追加',
  )!
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

describe('deriveTaskName', () => {
  it('改行・連続空白を1スペースへ畳み、前後空白を除去する', () => {
    expect(deriveTaskName('  クライアントへ返信する\n  今日中に ')).toBe('クライアントへ返信する 今日中に')
  })
  it('上限文字数で切る', () => {
    expect(deriveTaskName('あ'.repeat(100))).toHaveLength(TASK_NAME_MAX)
  })
})

describe('TaskConvertModal（③-B-3-1）', () => {
  it('かけら本文から初期値が入り、編集できる', () => {
    render()
    expect(nameInput().value).toBe('クライアントへ返信する 今日中に')
    setValue(nameInput(), 'メールを返す')
    expect(nameInput().value).toBe('メールを返す')
  })

  it('空・空白だけでは追加できない（ボタン無効・保存されない）', () => {
    render()
    setValue(nameInput(), '   ')
    expect(addButton().disabled).toBe(true)
    expect(app.todos).toHaveLength(0)
  })

  it('明示追加でだけタスクを1件追加し、成功でModalを閉じ通知する', () => {
    vi.useFakeTimers()
    render()
    expect(app.todos).toHaveLength(0)
    setValue(nameInput(), 'メールを返す')
    act(() => addButton().click())
    expect(app.todos).toHaveLength(1)
    expect(app.todos[0].text).toBe('メールを返す')
    expect(app.todos[0].due).toBe('')
    expect(app.todos[0].prio).toBe('low')
    expect(app.toast).toBe('タスクに追加しました')
    expect(container!.querySelector('#task-name-input')).not.toBeNull() // 連打吸収中
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(container!.textContent).not.toContain('入力内容を破棄しますか？')
    act(() => vi.advanceTimersByTime(251))
    expect(container!.querySelector('#task-name-input')).toBeNull() // 閉じた
    // 永続化
    const saved = JSON.parse(localStorage.getItem('oshi-os:v1:todos') ?? '{}')
    expect(saved.records).toHaveLength(1)
    expect(saved.records[0].text).toBe('メールを返す')
  })

  it('保存失敗時は入力・Modal・stateを保持し成功通知を出さず、再試行できる', () => {
    const originalSetItem = Storage.prototype.setItem
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'oshi-os:v1:todos') throw new DOMException('Quota exceeded', 'QuotaExceededError')
      return originalSetItem.call(this, key, value)
    })
    render()
    setValue(nameInput(), 'メールを返す')
    act(() => addButton().click())

    expect(app.todos).toHaveLength(0)
    expect(nameInput().value).toBe('メールを返す') // 入力保持・Modal維持
    expect(app.toast).toBe(STORAGE_FAILURE_MESSAGE)

    spy.mockImplementation(function (this: Storage, key, value) {
      return originalSetItem.call(this, key, value)
    })
    act(() => addButton().click())
    expect(app.todos).toHaveLength(1)
  })

  it('連打しても重複作成しない', () => {
    vi.useFakeTimers()
    render()
    setValue(nameInput(), 'メールを返す')
    act(() => {
      addButton().click()
      addButton().click()
    })
    expect(app.todos).toHaveLength(1)
    expect(container!.querySelector('#task-name-input')).not.toBeNull()
    act(() => vi.advanceTimersByTime(251))
    expect(container!.querySelector('#task-name-input')).toBeNull()
  })

  it('StrictModeでも重複作成しない', () => {
    render(true)
    setValue(nameInput(), 'メールを返す')
    act(() => addButton().click())
    expect(app.todos).toHaveLength(1)
  })

  it('変更がなければ破棄確認なしで閉じる', () => {
    render()
    act(() => byText('キャンセル')!.click())
    expect(container!.textContent).not.toContain('入力内容を破棄しますか？')
    expect(container!.querySelector('#task-name-input')).toBeNull()
  })

  it('未保存変更があるとキャンセルで破棄確認し、編集継続で入力保持・破棄で閉じる', () => {
    render()
    setValue(nameInput(), '別の内容')
    act(() => byText('キャンセル')!.click())
    expect(container!.textContent).toContain('入力内容を破棄しますか？')

    // 編集を続ける → 入力保持
    act(() => byText('編集を続ける')!.click())
    expect(nameInput().value).toBe('別の内容')

    // もう一度キャンセル → 破棄する → 変換Modalだけ閉じる
    act(() => byText('キャンセル')!.click())
    act(() => byText('破棄する')!.click())
    expect(container!.querySelector('#task-name-input')).toBeNull()
    expect(app.todos).toHaveLength(0) // 破棄で保存しない
  })
})

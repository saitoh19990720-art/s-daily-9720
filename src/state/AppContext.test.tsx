// @vitest-environment jsdom
import { StrictMode, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PlanModal from '../components/PlanModal'
import TodoModal from '../components/TodoModal'
import Toast from '../components/Toast'
import { AppProvider, STORAGE_FAILURE_MESSAGE, useApp } from './AppContext'

type AppApi = ReturnType<typeof useApp>

let root: Root | null = null
let container: HTMLDivElement | null = null
let app: AppApi

function Probe({
  withPlanModal = false,
  withTodoModal = false,
  withToast = false,
}: {
  withPlanModal?: boolean
  withTodoModal?: boolean
  withToast?: boolean
}) {
  app = useApp()
  return (
    <>
      <div data-testid="toast">{app.toast}</div>
      {withPlanModal && <PlanModal />}
      {withTodoModal && <TodoModal />}
      {withToast && <Toast />}
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
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
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

// リロード相当＝アンマウント後に新しいAppProviderを描画（localStorageは保持）。
function reload(ui: React.ReactNode) {
  if (root) act(() => root?.unmount())
  container?.remove()
  renderProbe(ui)
}

describe('タスク・会話のかけらの永続化（③-B-1）', () => {
  it('タスク追加・編集・完了・削除が再読み込み相当で復元する', () => {
    renderProbe(
      <AppProvider>
        <Probe />
      </AppProvider>,
    )
    // 各操作の間に再描画が入る実利用に合わせ、追加は別actで行う。
    act(() => app.addTodo('メールを返す', '', 'low'))
    act(() => app.addTodo('作業する', '', 'high'))
    const first = app.todos[0].id

    reload(
      <AppProvider>
        <Probe />
      </AppProvider>,
    )
    expect(app.todos.map((t) => t.text)).toEqual(['メールを返す', '作業する'])
    expect(app.todos[0].createdAt).toBeTruthy()

    act(() => app.toggleTodo(first))
    act(() => app.editTodo(app.todos[1].id, '読書する', '', 'mid'))
    act(() => app.deleteTodo(first))

    reload(
      <AppProvider>
        <Probe />
      </AppProvider>,
    )
    expect(app.todos).toHaveLength(1)
    expect(app.todos[0].text).toBe('読書する')
    expect(app.todos[0].prio).toBe('mid')
  })

  it('会話のかけらは保存ボタンを押す前は保存されず、明示保存後に元会話と保存元付きで復元する', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    renderProbe(
      <AppProvider>
        <Probe />
      </AppProvider>,
    )
    act(() => app.sendChat('この内容をメモに残して'))
    act(() => vi.advanceTimersByTime(601))
    act(() => vi.advanceTimersByTime(301))
    // まだ保存されていない
    expect(app.memos).toHaveLength(0)
    expect(localStorage.getItem('oshi-os:v1:fragments')).toBeNull()

    const candidate = app.chatItems.find((item) => item.kind === 'ext')
    act(() => app.saveCandidate(candidate!.id))

    reload(
      <AppProvider>
        <Probe />
      </AppProvider>,
    )
    expect(app.memos).toHaveLength(1)
    expect(app.memos[0].text).toBe('会話メモ')
    expect(app.memos[0].source).toBe('chat')
    expect(app.memos[0].origin).toEqual([
      { role: 'user', content: 'この内容をメモに残して' },
      { role: 'oshi', content: expect.any(String) },
    ])
    expect(app.memos[0].schemaVersion).toBe(1)
  })

  it('タスク保存失敗時は入力・Modal・stateを保持し、再試行で1件だけ保存する', () => {
    const originalSetItem = Storage.prototype.setItem
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, key, value) {
        if (key === 'oshi-os:v1:todos') throw new DOMException('Quota exceeded', 'QuotaExceededError')
        return originalSetItem.call(this, key, value)
      })
    renderProbe(
      <AppProvider>
        <Probe withTodoModal />
      </AppProvider>,
    )
    act(() => app.openTodoModal())
    const input = container?.querySelector<HTMLInputElement>('[role="dialog"] input[type="text"]')
    setInputValue(input!, 'メールを返す')
    const saveButton = [...(container?.querySelectorAll<HTMLButtonElement>('.modal-acts button') ?? [])].find(
      (button) => button.textContent === '保存',
    )
    act(() => saveButton?.click())

    // 失敗：入力保持・Modal維持・state変更なし・エラー通知
    expect(input?.value).toBe('メールを返す')
    expect(container?.querySelector('.modal-overlay.open')).not.toBeNull()
    expect(app.todos).toEqual([])
    expect(localStorage.getItem('oshi-os:v1:todos')).toBeNull()
    expect(app.toast).toBe(STORAGE_FAILURE_MESSAGE)

    // 再試行：成功で1件だけ
    setItemSpy.mockImplementation(function (this: Storage, key, value) {
      return originalSetItem.call(this, key, value)
    })
    act(() => saveButton?.click())
    expect(container?.querySelector('.modal-overlay.open')).toBeNull()
    expect(app.todos).toHaveLength(1)
    expect(app.todos[0].text).toBe('メールを返す')
  })

  it('同じ会話候補を連打しても重複せず、失敗後の再試行は1件だけ保存する', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const originalSetItem = Storage.prototype.setItem
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, key, value) {
        if (key === 'oshi-os:v1:fragments') throw new DOMException('Quota exceeded', 'QuotaExceededError')
        return originalSetItem.call(this, key, value)
      })
    renderProbe(
      <AppProvider>
        <Probe />
      </AppProvider>,
    )
    act(() => app.sendChat('この内容をメモに残して'))
    act(() => vi.advanceTimersByTime(601))
    act(() => vi.advanceTimersByTime(301))
    const candidate = app.chatItems.find((item) => item.kind === 'ext')

    // 失敗：保存されない
    act(() => app.saveCandidate(candidate!.id))
    expect(app.memos).toHaveLength(0)
    expect(app.toast).toBe(STORAGE_FAILURE_MESSAGE)

    // 復旧して連打しても1件だけ
    setItemSpy.mockImplementation(function (this: Storage, key, value) {
      return originalSetItem.call(this, key, value)
    })
    act(() => {
      app.saveCandidate(candidate!.id)
      app.saveCandidate(candidate!.id)
    })
    expect(app.memos).toHaveLength(1)
  })

  it('候補表示後に別経路で追加したタスク・かけらを候補保存で失わない', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    renderProbe(
      <AppProvider>
        <Probe />
      </AppProvider>,
    )

    act(() => app.sendChat('この内容をメモに残して'))
    act(() => vi.advanceTimersByTime(601))
    act(() => vi.advanceTimersByTime(301))
    const memoCandidate = app.chatItems.find((item) => item.kind === 'ext')
    act(() => app.addMemo('手動で追加したかけら'))
    act(() => app.saveCandidate(memoCandidate!.id))
    expect(app.memos.map((memo) => memo.text)).toEqual(['会話メモ', '手動で追加したかけら'])

    act(() => app.sendChat('メールを返信する'))
    act(() => vi.advanceTimersByTime(601))
    act(() => vi.advanceTimersByTime(301))
    const todoCandidate = app.chatItems.find(
      (item) => item.kind === 'ext' && item.extract.type === 'todo',
    )
    act(() => app.addTodo('手動で追加したタスク', '', 'low'))
    act(() => app.saveCandidate(todoCandidate!.id))
    expect(app.todos.map((todo) => todo.text)).toEqual(['手動で追加したタスク', '返信タスク'])
  })

  it('データ初期化は新キーを消し、推し設定・テーマは残す', () => {
    renderProbe(
      <AppProvider>
        <Probe />
      </AppProvider>,
    )
    act(() => {
      app.addTodo('タスク', '', 'low')
      app.addMemo('かけら')
      app.saveOshi({ ...app.oshi, name: 'あかり' })
    })
    expect(localStorage.getItem('oshi-os:v1:todos')).not.toBeNull()
    expect(localStorage.getItem('oshi-os:v1:fragments')).not.toBeNull()

    let ok = false
    act(() => {
      ok = app.resetRecordData()
    })
    expect(ok).toBe(true)
    expect(app.todos).toEqual([])
    expect(app.memos).toEqual([])
    expect(localStorage.getItem('oshi-os:v1:todos')).toBeNull()
    expect(localStorage.getItem('oshi-os:v1:fragments')).toBeNull()
    // 設定系は保持
    expect(localStorage.getItem('oshi')).not.toBeNull()
    expect(app.oshi.name).toBe('あかり')
  })

  it('タスク・かけら操作で既存キー（planItems / hlogs / theme）は変化しない', () => {
    renderProbe(
      <AppProvider>
        <Probe />
      </AppProvider>,
    )
    act(() => {
      app.addPlanItem('作業', '10:00', 'task')
      app.saveHealth({ date: '07/21', mood: '😊', pain: 'なし', tags: '', memo: '元気', period: false })
    })
    const planBefore = localStorage.getItem('planItems')
    const healthBefore = localStorage.getItem('hlogs')
    const themeBefore = localStorage.getItem('theme')

    act(() => {
      app.addTodo('タスク', '', 'low')
      app.addMemo('かけら')
    })

    expect(localStorage.getItem('planItems')).toBe(planBefore)
    expect(localStorage.getItem('hlogs')).toBe(healthBefore)
    expect(localStorage.getItem('theme')).toBe(themeBefore)
  })
})

describe('Toastの読み上げ', () => {
  it('通常通知とエラー通知をaria-live領域へ表示する', () => {
    vi.useFakeTimers()
    renderProbe(
      <AppProvider>
        <Probe withToast />
      </AppProvider>,
    )

    act(() => app.showToast('保存しました'))
    const toast = container?.querySelector('.toast')
    expect(toast?.getAttribute('role')).toBe('status')
    expect(toast?.getAttribute('aria-live')).toBe('polite')
    expect(toast?.getAttribute('aria-atomic')).toBe('true')
    expect(toast?.textContent).toBe('保存しました')

    act(() => app.showToast(STORAGE_FAILURE_MESSAGE))
    expect(toast?.textContent).toBe(STORAGE_FAILURE_MESSAGE)
  })
})

// 会話由来のかけらを1件だけ作って返す（origin付き）。fake timers前提。
function seedChatMemo() {
  vi.spyOn(Math, 'random').mockReturnValue(0)
  renderProbe(
    <AppProvider>
      <Probe />
    </AppProvider>,
  )
  act(() => app.sendChat('この内容をメモに残して'))
  act(() => vi.advanceTimersByTime(601))
  act(() => vi.advanceTimersByTime(301))
  const candidate = app.chatItems.find((item) => item.kind === 'ext')
  act(() => app.saveCandidate(candidate!.id))
  return app.memos[0]
}

describe('会話のかけらの詳細編集・削除（③-B-2）', () => {
  it('本文とタグを更新するとid/createdAt/source/originを維持しupdatedAtだけ変わる、再読込でも保持', () => {
    vi.useFakeTimers()
    const before = seedChatMemo()
    const id = before.id
    expect(before.source).toBe('chat')
    expect(before.origin).toHaveLength(2)

    act(() => vi.advanceTimersByTime(1000))
    let result: string | undefined
    act(() => {
      result = app.updateMemo(id, '書き直した本文', ['嬉しい', '推し'])
    })
    expect(result).toBe('saved')

    reload(
      <AppProvider>
        <Probe />
      </AppProvider>,
    )
    const after = app.memos.find((m) => m.id === id)!
    expect(after.text).toBe('書き直した本文')
    expect(after.tags).toEqual(['嬉しい', '推し'])
    expect(after.id).toBe(id)
    expect(after.createdAt).toBe(before.createdAt)
    expect(after.source).toBe('chat')
    expect(after.origin).toEqual(before.origin)
    expect(after.schemaVersion).toBe(before.schemaVersion)
    expect(after.updatedAt).not.toBe(before.updatedAt)
  })

  it('変更がなければ保存せず（setItem未呼び出し・updatedAt不変）unchangedを返す', () => {
    vi.useFakeTimers()
    const memo = seedChatMemo()
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    let result: string | undefined
    act(() => {
      result = app.updateMemo(memo.id, memo.text, memo.tags)
    })
    expect(result).toBe('unchanged')
    expect(spy).not.toHaveBeenCalled()
    expect(app.memos[0].updatedAt).toBe(memo.updatedAt)
  })

  it('同一描画内の連打でも更新・削除を重複保存しない', () => {
    vi.useFakeTimers()
    const memo = seedChatMemo()
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    let firstUpdate: string | undefined
    let secondUpdate: string | undefined
    act(() => {
      firstUpdate = app.updateMemo(memo.id, '連打した本文', ['tag'])
      secondUpdate = app.updateMemo(memo.id, '連打した本文', ['tag'])
    })
    expect(firstUpdate).toBe('saved')
    expect(secondUpdate).toBe('unchanged')
    expect(spy.mock.calls.filter(([key]) => key === 'oshi-os:v1:fragments')).toHaveLength(1)

    spy.mockClear()
    let firstDelete: boolean | undefined
    let secondDelete: boolean | undefined
    act(() => {
      firstDelete = app.deleteMemoById(memo.id)
      secondDelete = app.deleteMemoById(memo.id)
    })
    expect(firstDelete).toBe(true)
    expect(secondDelete).toBe(false)
    expect(spy.mock.calls.filter(([key]) => key === 'oshi-os:v1:fragments')).toHaveLength(1)
  })

  it('タグを整形する（前後空白除去・空タグ除外・完全一致重複除外・件数と文字数の上限）', () => {
    vi.useFakeTimers()
    const memo = seedChatMemo()
    const many = Array.from({ length: 12 }, (_, i) => `t${i}`)
    act(() => {
      app.updateMemo(memo.id, memo.text, ['  a  ', 'a', '', '   ', 'b'])
    })
    expect(app.memos[0].tags).toEqual(['a', 'b'])

    act(() => {
      app.updateMemo(memo.id, memo.text, many)
    })
    expect(app.memos[0].tags).toHaveLength(10)

    const longTag = 'あ'.repeat(21)
    act(() => {
      app.updateMemo(memo.id, memo.text, ['ok', longTag])
    })
    expect(app.memos[0].tags).toEqual(['ok'])
  })

  it('更新保存例外時はerrorを返しstateを変えず、再試行で保存できる', () => {
    vi.useFakeTimers()
    const memo = seedChatMemo()
    const originalSetItem = Storage.prototype.setItem
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'oshi-os:v1:fragments') throw new DOMException('Quota exceeded', 'QuotaExceededError')
      return originalSetItem.call(this, key, value)
    })
    let result: string | undefined
    act(() => {
      result = app.updateMemo(memo.id, '新しい本文', ['tag'])
    })
    expect(result).toBe('error')
    expect(app.memos[0].text).toBe(memo.text)
    expect(app.toast).toBe(STORAGE_FAILURE_MESSAGE)

    spy.mockImplementation(function (this: Storage, key, value) {
      return originalSetItem.call(this, key, value)
    })
    act(() => {
      result = app.updateMemo(memo.id, '新しい本文', ['tag'])
    })
    expect(result).toBe('saved')
    expect(app.memos[0].text).toBe('新しい本文')
  })

  it('deleteMemoByIdは成功で除外し再読込でも復元しない、失敗ではstateを保持する', () => {
    vi.useFakeTimers()
    const memo = seedChatMemo()

    // 失敗：state不変・false
    const originalSetItem = Storage.prototype.setItem
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'oshi-os:v1:fragments') throw new DOMException('denied', 'SecurityError')
      return originalSetItem.call(this, key, value)
    })
    let ok: boolean | undefined
    act(() => {
      ok = app.deleteMemoById(memo.id)
    })
    expect(ok).toBe(false)
    expect(app.memos).toHaveLength(1)

    // 復旧して削除成功
    spy.mockImplementation(function (this: Storage, key, value) {
      return originalSetItem.call(this, key, value)
    })
    act(() => {
      ok = app.deleteMemoById(memo.id)
    })
    expect(ok).toBe(true)
    expect(app.memos).toHaveLength(0)

    reload(
      <AppProvider>
        <Probe />
      </AppProvider>,
    )
    expect(app.memos).toHaveLength(0)
  })

  it('更新・削除で既存キー（planItems / theme）は変化しない', () => {
    vi.useFakeTimers()
    const memo = seedChatMemo()
    act(() => app.addPlanItem('作業', '10:00', 'task'))
    const planBefore = localStorage.getItem('planItems')
    const themeBefore = localStorage.getItem('theme')

    act(() => app.updateMemo(memo.id, '変えた', ['x']))
    act(() => app.deleteMemoById(memo.id))

    expect(localStorage.getItem('planItems')).toBe(planBefore)
    expect(localStorage.getItem('theme')).toBe(themeBefore)
  })
})

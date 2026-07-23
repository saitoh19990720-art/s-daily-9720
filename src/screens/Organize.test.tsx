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
  vi.useRealTimers()
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

// ③-B-2：かけら詳細・編集・タグ・破棄確認・削除確認
const SEED_MEMO = {
  id: 'r-seed',
  text: '残しておきたい会話',
  date: '07/21',
  createdAt: '2026-07-21T00:00:00.000Z',
  updatedAt: '2026-07-21T00:00:00.000Z',
  source: 'chat' as const,
  origin: [
    { role: 'user' as const, content: '今日つらい' },
    { role: 'oshi' as const, content: 'おつかれさま' },
  ],
  tags: ['気分'],
  schemaVersion: 1,
}

function seedFragment(memo: unknown = SEED_MEMO) {
  localStorage.setItem('oshi-os:v1:fragments', JSON.stringify({ schemaVersion: 1, records: [memo] }))
}

function detailCard(): HTMLButtonElement {
  const card = container?.querySelector<HTMLButtonElement>('[aria-label$="の詳細を開く"]')
  if (!card) throw new Error('detail card not found')
  return card
}

describe('会話のかけらの詳細（③-B-2）', () => {
  it('カードから詳細を開き、本文・保存元・元会話・タグ・日時を表示する', () => {
    seedFragment()
    renderApp('#/organize/fragments')
    act(() => detailCard().click())

    const dialog = container!.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('残しておきたい会話')
    expect(dialog.textContent).toContain('会話から')
    expect(dialog.textContent).toContain('気分') // タグ
    expect(dialog.textContent).toContain('あなた') // 元会話ラベル
    expect(dialog.textContent).toContain('今日つらい') // ユーザー発言
    expect(dialog.textContent).toContain('おつかれさま') // AI応答
    expect(dialog.textContent).toContain('2026/07/21') // 日時
  })

  it('本文を編集して保存すると反映され、localStorageへ永続化される', () => {
    seedFragment()
    renderApp('#/organize/fragments')
    act(() => detailCard().click())
    act(() => button('編集').click())

    const textarea = container!.querySelector<HTMLTextAreaElement>('[role="dialog"] textarea')!
    setFormValue(textarea, '書き直した本文')
    act(() => button('保存').click())

    expect(container?.textContent).toContain('書き直した本文')
    const saved = JSON.parse(localStorage.getItem('oshi-os:v1:fragments') ?? '{}')
    expect(saved.records[0].text).toBe('書き直した本文')
    expect(saved.records[0].id).toBe('r-seed')
    expect(saved.records[0].createdAt).toBe('2026-07-21T00:00:00.000Z')
    expect(saved.records[0].origin).toHaveLength(2)
  })

  it('タグを追加・削除できる', () => {
    seedFragment()
    renderApp('#/organize/fragments')
    act(() => detailCard().click())
    act(() => button('編集').click())

    const tagInput = container!.querySelector<HTMLInputElement>('#fd-tag-input')!
    setFormValue(tagInput, '推し活')
    act(() => button('追加').click())
    expect(container?.querySelector('[role="dialog"]')?.textContent).toContain('推し活')

    // 追加した「推し活」を削除
    const removeBtn = container!.querySelector<HTMLButtonElement>('[aria-label="タグ「推し活」を削除"]')!
    act(() => removeBtn.click())
    expect(container!.querySelector('[aria-label="タグ「推し活」を削除"]')).toBeNull()
  })

  it('既存の重複タグを開いただけでは未保存変更と判定せず、Reactの重複key警告も出さない', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    seedFragment({ ...SEED_MEMO, tags: ['気分', '気分'] })
    renderApp('#/organize/fragments')
    act(() => detailCard().click())
    act(() => button('編集').click())
    act(() => button('キャンセル').click())

    expect(container?.textContent).not.toContain('変更を破棄しますか？')
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('タグ上限時に未追加タグを黙って捨てず、編集内容とModalを維持する', () => {
    const tags = Array.from({ length: 10 }, (_, index) => `tag${index}`)
    seedFragment({ ...SEED_MEMO, tags })
    renderApp('#/organize/fragments')
    act(() => detailCard().click())
    act(() => button('編集').click())

    const tagInput = container!.querySelector<HTMLInputElement>('#fd-tag-input')!
    setFormValue(tagInput, '追加できないタグ')
    act(() => button('保存').click())

    expect(container!.querySelector<HTMLTextAreaElement>('#fd-edit-text')).not.toBeNull()
    expect(container!.querySelector<HTMLInputElement>('#fd-tag-input')?.value).toBe('追加できないタグ')
    expect(container?.textContent).toContain('タグは10個までにしてね')
  })

  it('更新保存失敗時は入力・編集Modal・保存済みデータを維持し、成功通知を出さない', () => {
    seedFragment()
    renderApp('#/organize/fragments')
    act(() => detailCard().click())
    act(() => button('編集').click())
    const textarea = container!.querySelector<HTMLTextAreaElement>('#fd-edit-text')!
    setFormValue(textarea, '保存に失敗する編集内容')

    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'oshi-os:v1:fragments') throw new DOMException('quota', 'QuotaExceededError')
      return originalSetItem.call(this, key, value)
    })
    act(() => button('保存').click())

    expect(container!.querySelector<HTMLTextAreaElement>('#fd-edit-text')?.value).toBe('保存に失敗する編集内容')
    expect(container?.querySelector('[role="dialog"] .modal-title')?.textContent).toBe('かけらを編集')
    expect(JSON.parse(localStorage.getItem('oshi-os:v1:fragments') ?? '{}').records[0].text).toBe(SEED_MEMO.text)
    expect(container?.textContent).toContain('保存できませんでした')
    expect(container?.textContent).not.toContain('会話のかけらを更新しました')
  })

  it('未保存変更がある時だけ破棄確認を出し、破棄で元の本文へ戻す', () => {
    seedFragment()
    renderApp('#/organize/fragments')
    act(() => detailCard().click())

    // 変更なしで編集→キャンセル：破棄確認は出ない
    act(() => button('編集').click())
    act(() => button('キャンセル').click())
    expect(container?.textContent).not.toContain('変更を破棄しますか？')

    // 変更あり→キャンセル：破棄確認
    act(() => button('編集').click())
    const textarea = container!.querySelector<HTMLTextAreaElement>('[role="dialog"] textarea')!
    setFormValue(textarea, 'まだ保存しない変更')
    act(() => button('キャンセル').click())
    expect(container?.textContent).toContain('変更を破棄しますか？')

    act(() => button('破棄する').click())
    expect(container?.textContent).toContain('残しておきたい会話')
    expect(container?.textContent).not.toContain('まだ保存しない変更')
  })

  it('削除は確認後にだけ実行され、カードが消える', () => {
    seedFragment()
    renderApp('#/organize/fragments')
    act(() => detailCard().click())

    act(() => button('削除').click())
    expect(container?.textContent).toContain('このかけらを削除しますか？')
    // まだ消えていない
    expect(JSON.parse(localStorage.getItem('oshi-os:v1:fragments') ?? '{}').records).toHaveLength(1)

    act(() => button('削除する').click())
    expect(container?.querySelector('[aria-label$="の詳細を開く"]')).toBeNull()
    expect(container?.textContent).toContain('まだ残した会話のかけらはありません')
    expect(JSON.parse(localStorage.getItem('oshi-os:v1:fragments') ?? '{}').records).toHaveLength(0)
  })

  it('削除保存失敗時は詳細・保存済みデータを維持し、成功通知を出さない', () => {
    seedFragment()
    renderApp('#/organize/fragments')
    act(() => detailCard().click())
    act(() => button('削除').click())

    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === 'oshi-os:v1:fragments') throw new DOMException('denied', 'SecurityError')
      return originalSetItem.call(this, key, value)
    })
    act(() => button('削除する').click())

    expect(container?.querySelector('[role="dialog"] .modal-title')?.textContent).toBe('かけらの詳細')
    expect(JSON.parse(localStorage.getItem('oshi-os:v1:fragments') ?? '{}').records).toHaveLength(1)
    expect(container?.textContent).toContain('保存できませんでした')
    expect(container?.textContent).not.toContain('削除しました')
  })
})

describe('かけら→タスク変換（③-B-3-1）', () => {
  it('変換Modalを閉じると、開いた「タスクにする」ボタンへフォーカスを戻す', () => {
    seedFragment()
    renderApp('#/organize/fragments')
    act(() => detailCard().click())
    const trigger = container!.querySelector<HTMLButtonElement>('.btn-task')!
    act(() => trigger.click())
    act(() => button('キャンセル').click())

    expect(document.activeElement).toBe(trigger)
    expect(container?.querySelector('#task-name-input')).toBeNull()
    expect(container?.querySelector('[role="dialog"] .modal-title')?.textContent).toBe('かけらの詳細')
  })

  it('詳細から「タスクにする」で初期値付きModalを開き、追加でタスク一覧へ反映・かけらは不変', () => {
    vi.useFakeTimers()
    seedFragment()
    renderApp('#/organize/fragments')
    act(() => detailCard().click())

    // ③-B-3-2で「予定にする」が追加されても、タスク変換は独立して動作する。
    act(() => container!.querySelector<HTMLButtonElement>('.btn-task')!.click())
    const input = container!.querySelector<HTMLInputElement>('#task-name-input')!
    expect(input.value).toBe('残しておきたい会話') // かけら本文由来の初期値
    // 明示追加前はタスク未保存
    expect(localStorage.getItem('oshi-os:v1:todos')).toBeNull()

    setFormValue(input, '会話を後で見返す')
    act(() => button('タスクを追加').click())

    // 永続化＆成功通知
    const savedTodos = JSON.parse(localStorage.getItem('oshi-os:v1:todos') ?? '{}')
    expect(savedTodos.records).toHaveLength(1)
    expect(savedTodos.records[0].text).toBe('会話を後で見返す')
    expect(container?.textContent).toContain('タスクに追加しました')
    // 変換Modalは閉じ、詳細は維持
    act(() => vi.advanceTimersByTime(251))
    expect(container?.querySelector('#task-name-input')).toBeNull()
    expect(container?.querySelector('[role="dialog"] .modal-title')?.textContent).toBe('かけらの詳細')

    // 元のかけらは不変（本文/タグ/updatedAt/origin）
    const frag = JSON.parse(localStorage.getItem('oshi-os:v1:fragments') ?? '{}').records[0]
    expect(frag.text).toBe(SEED_MEMO.text)
    expect(frag.tags).toEqual(SEED_MEMO.tags)
    expect(frag.updatedAt).toBe(SEED_MEMO.updatedAt)
    expect(frag.origin).toHaveLength(2)

    // 詳細を閉じてタスクタブへ → 反映を確認
    act(() => button('閉じる').click())
    act(() => button('タスク').click())
    expect(container?.textContent).toContain('会話を後で見返す')
  })

  it('タスク作成で予定・健康・設定・かけらの保存キーを変更しない', () => {
    localStorage.setItem('planItems', JSON.stringify([{ text: '予定', time: '', cat: 'task' }]))
    localStorage.setItem('hlogs', JSON.stringify([]))
    localStorage.setItem('theme', 'dark')
    seedFragment()
    renderApp('#/organize/fragments')

    const planBefore = localStorage.getItem('planItems')
    const hlogsBefore = localStorage.getItem('hlogs')
    const themeBefore = localStorage.getItem('theme')
    const fragBefore = localStorage.getItem('oshi-os:v1:fragments')

    act(() => detailCard().click())
    act(() => container!.querySelector<HTMLButtonElement>('.btn-task')!.click())
    setFormValue(container!.querySelector<HTMLInputElement>('#task-name-input')!, 'タスクにする内容')
    act(() => button('タスクを追加').click())

    expect(localStorage.getItem('planItems')).toBe(planBefore)
    expect(localStorage.getItem('hlogs')).toBe(hlogsBefore)
    expect(localStorage.getItem('theme')).toBe(themeBefore)
    expect(localStorage.getItem('oshi-os:v1:fragments')).toBe(fragBefore)
  })
})

describe('かけら→予定変換（③-B-3-2）', () => {
  it('詳細から「予定にする」で初期値付きModalを開き、追加で予定一覧へ反映・かけら不変・フォーカス復帰', () => {
    vi.useFakeTimers()
    seedFragment()
    renderApp('#/organize/fragments')
    act(() => detailCard().click())

    // タスク変換と共存（両方の入口がある）
    expect(container!.querySelector('.btn-task')).not.toBeNull()
    expect(container!.querySelector('.btn-plan')).not.toBeNull()

    act(() => container!.querySelector<HTMLButtonElement>('.btn-plan')!.click())
    const nameInput = container!.querySelector<HTMLInputElement>('#plan-name-input')!
    expect(nameInput.value).toBe('残しておきたい会話') // かけら本文由来
    // 明示追加前は予定未保存
    expect(localStorage.getItem('planItems')).toBeNull()

    setFormValue(nameInput, '配信を見る')
    setFormValue(container!.querySelector<HTMLInputElement>('#plan-time-input')!, '20:00')
    act(() => button('予定を追加').click())

    // 永続化（既存planItems形式＝素の配列・時間ずれなし）
    expect(JSON.parse(localStorage.getItem('planItems') ?? '[]')).toEqual([
      { text: '配信を見る', time: '20:00', cat: 'fun' },
    ])
    expect(container?.textContent).toContain('予定に追加しました')

    // 250ms吸収後：変換Modalだけ閉じ、詳細維持、フォーカスは「予定にする」へ復帰
    act(() => vi.advanceTimersByTime(251))
    act(() => vi.advanceTimersByTime(16)) // 親Modalの再描画後、次フレームで復帰
    expect(container?.querySelector('#plan-name-input')).toBeNull()
    expect(container?.querySelector('[role="dialog"] .modal-title')?.textContent).toBe('かけらの詳細')
    expect(document.activeElement).toBe(container!.querySelector('.btn-plan'))

    // 元のかけらは不変
    const frag = JSON.parse(localStorage.getItem('oshi-os:v1:fragments') ?? '{}').records[0]
    expect(frag.text).toBe(SEED_MEMO.text)
    expect(frag.tags).toEqual(SEED_MEMO.tags)
    expect(frag.updatedAt).toBe(SEED_MEMO.updatedAt)
    expect(frag.origin).toHaveLength(2)

    // 詳細を閉じて予定タブへ → 反映確認
    act(() => button('閉じる').click())
    act(() => button('予定').click())
    expect(container?.textContent).toContain('配信を見る')
  })

  it('予定作成でタスク・健康・設定・かけらの保存キーを変更しない', () => {
    localStorage.setItem('oshi-os:v1:todos', JSON.stringify({ schemaVersion: 1, records: [] }))
    localStorage.setItem('hlogs', JSON.stringify([]))
    localStorage.setItem('theme', 'dark')
    seedFragment()
    renderApp('#/organize/fragments')

    const todosBefore = localStorage.getItem('oshi-os:v1:todos')
    const hlogsBefore = localStorage.getItem('hlogs')
    const themeBefore = localStorage.getItem('theme')
    const fragBefore = localStorage.getItem('oshi-os:v1:fragments')

    act(() => detailCard().click())
    act(() => container!.querySelector<HTMLButtonElement>('.btn-plan')!.click())
    setFormValue(container!.querySelector<HTMLInputElement>('#plan-name-input')!, '予定にする内容')
    act(() => button('予定を追加').click())

    expect(localStorage.getItem('oshi-os:v1:todos')).toBe(todosBefore)
    expect(localStorage.getItem('hlogs')).toBe(hlogsBefore)
    expect(localStorage.getItem('theme')).toBe(themeBefore)
    expect(localStorage.getItem('oshi-os:v1:fragments')).toBe(fragBefore)
  })

  it('既存のタスク変換が引き続き動作する（予定変換の追加で壊れない）', () => {
    vi.useFakeTimers()
    seedFragment()
    renderApp('#/organize/fragments')
    act(() => detailCard().click())
    act(() => container!.querySelector<HTMLButtonElement>('.btn-task')!.click())
    setFormValue(container!.querySelector<HTMLInputElement>('#task-name-input')!, 'タスク側も動く')
    act(() => button('タスクを追加').click())
    expect(JSON.parse(localStorage.getItem('oshi-os:v1:todos') ?? '{}').records[0].text).toBe('タスク側も動く')
  })
})

// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_OSHI,
  FRAGMENT_SCHEMA_VERSION,
  LocalStorageRepository,
  TODO_SCHEMA_VERSION,
} from './repository'
import type { Memo, Todo } from './types'

const TODO_KEY = 'oshi-os:v1:todos'
const FRAGMENT_KEY = 'oshi-os:v1:fragments'

const sampleTodo = (over: Partial<Todo> = {}): Todo => ({
  id: 'r-1',
  text: 'メールを返す',
  done: false,
  due: '',
  prio: 'low',
  createdAt: '2026-07-21T00:00:00.000Z',
  updatedAt: '2026-07-21T00:00:00.000Z',
  ...over,
})

const sampleMemo = (over: Partial<Memo> = {}): Memo => ({
  id: 'r-2',
  text: '嬉しかったこと',
  date: '07/21',
  createdAt: '2026-07-21T00:00:00.000Z',
  updatedAt: '2026-07-21T00:00:00.000Z',
  source: 'chat',
  origin: [
    { role: 'user', content: '今日いいことあった' },
    { role: 'oshi', content: 'よかったね' },
  ],
  tags: [],
  schemaVersion: FRAGMENT_SCHEMA_VERSION,
  ...over,
})

describe('LocalStorageRepository', () => {
  const repository = new LocalStorageRepository()

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('破損JSONを初期値へ復旧する', () => {
    localStorage.setItem('planItems', '{broken')
    localStorage.setItem('hlogs', '[broken')

    expect(repository.getPlanItems()).toBeNull()
    expect(repository.getHealthLogs()).toEqual([])
  })

  it('正しいJSONでもルート構造が不正なら初期値へ復旧する', () => {
    localStorage.setItem('oshi', JSON.stringify(['not-an-oshi']))
    localStorage.setItem('planItems', JSON.stringify({ text: '予定' }))
    localStorage.setItem('hlogs', JSON.stringify('not-an-array'))

    expect(repository.getOshi()).toBeNull()
    expect(repository.getPlanItems()).toBeNull()
    expect(repository.getHealthLogs()).toEqual([])
  })

  it('配列内の不正レコードだけを除外する', () => {
    const validPlan = { text: '配信', time: '20:00', cat: 'fun' }
    const validHealth = {
      date: '07/20',
      mood: '😊',
      pain: 'なし',
      tags: '',
      memo: '元気',
      period: false,
    }
    localStorage.setItem(
      'planItems',
      JSON.stringify([validPlan, null, { ...validPlan, cat: 'invalid' }, { time: '10:00' }]),
    )
    localStorage.setItem(
      'hlogs',
      JSON.stringify([validHealth, 1, { ...validHealth, period: 'false' }]),
    )

    expect(repository.getPlanItems()).toEqual([validPlan])
    expect(repository.getHealthLogs()).toEqual([validHealth])
  })

  it('既存の正常データを値を変えずに読み込む', () => {
    const oshi = { ...DEFAULT_OSHI, name: 'あかり', avatarImg: 'data:image/png;base64,abc' }
    const plans = [
      { text: '作業', time: '10:00', cat: 'task' as const },
      { text: '休憩', time: '', cat: 'rest' as const },
    ]
    localStorage.setItem('oshi', JSON.stringify(oshi))
    localStorage.setItem('planItems', JSON.stringify(plans))
    localStorage.setItem('theme', 'system')

    expect(repository.getOshi()).toEqual(oshi)
    expect(repository.getPlanItems()).toEqual(plans)
    expect(repository.getTheme()).toBe('system')
  })

  it('localStorage保存例外を成功扱いにしない', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })

    expect(repository.setPlanItems([{ text: '予定', time: '', cat: 'task' }])).toBe(false)
    expect(repository.setOshi(DEFAULT_OSHI)).toBe(false)
  })

  describe('タスク・会話のかけらの永続化（③-B-1）', () => {
    it('タスクをバージョン付きルートで保存し、そのまま読み戻す', () => {
      const todos = [sampleTodo(), sampleTodo({ id: 'r-9', text: '作業', done: true, prio: 'high' })]
      expect(repository.setTodos(todos)).toBe(true)
      const root = JSON.parse(localStorage.getItem(TODO_KEY) ?? '{}')
      expect(root.schemaVersion).toBe(TODO_SCHEMA_VERSION)
      expect(repository.getTodos()).toEqual(todos)
    })

    it('会話のかけらを元会話スナップショット・保存元付きで保存し読み戻す', () => {
      const memos = [sampleMemo(), sampleMemo({ id: 'r-3', source: 'manual', origin: [], tags: ['推し'] })]
      expect(repository.setMemos(memos)).toBe(true)
      const root = JSON.parse(localStorage.getItem(FRAGMENT_KEY) ?? '{}')
      expect(root.schemaVersion).toBe(FRAGMENT_SCHEMA_VERSION)
      const loaded = repository.getMemos()
      expect(loaded).toEqual(memos)
      expect(loaded[0].source).toBe('chat')
      expect(loaded[0].origin).toHaveLength(2)
    })

    it('破損JSONは空状態へ復旧する', () => {
      localStorage.setItem(TODO_KEY, '{broken')
      localStorage.setItem(FRAGMENT_KEY, '[broken')
      expect(repository.getTodos()).toEqual([])
      expect(repository.getMemos()).toEqual([])
    })

    it('ルート構造が不正（records配列でない）なら空状態へ復旧する', () => {
      localStorage.setItem(TODO_KEY, JSON.stringify([sampleTodo()]))
      localStorage.setItem(FRAGMENT_KEY, JSON.stringify({ schemaVersion: 1, records: 'x' }))
      expect(repository.getTodos()).toEqual([])
      expect(repository.getMemos()).toEqual([])
    })

    it('不正レコードが混在しても正常レコードだけ残す', () => {
      const validTodo = sampleTodo()
      localStorage.setItem(
        TODO_KEY,
        JSON.stringify({
          schemaVersion: 1,
          records: [validTodo, null, { id: 'x', text: 't', done: 'no', due: '', prio: 'low' }, { ...validTodo, prio: 'urgent' }],
        }),
      )
      const validMemo = sampleMemo()
      localStorage.setItem(
        FRAGMENT_KEY,
        JSON.stringify({
          schemaVersion: 1,
          records: [validMemo, 1, { id: 'x', text: 't' }, { ...validMemo, source: 'system' }],
        }),
      )
      expect(repository.getTodos()).toEqual([validTodo])
      expect(repository.getMemos()).toEqual([validMemo])
    })

    it('未知フィールドがあってもアプリを壊さず既知項目だけ復元する', () => {
      localStorage.setItem(
        TODO_KEY,
        JSON.stringify({ schemaVersion: 1, records: [{ ...sampleTodo(), extra: 'unknown' }] }),
      )
      localStorage.setItem(
        FRAGMENT_KEY,
        JSON.stringify({ schemaVersion: 1, records: [{ ...sampleMemo(), extra: 'unknown', tags: 'notarray' }] }),
      )
      const todo = repository.getTodos()[0]
      expect((todo as unknown as Record<string, unknown>).extra).toBeUndefined()
      expect(todo).toEqual(sampleTodo())
      const memo = repository.getMemos()[0]
      expect((memo as unknown as Record<string, unknown>).extra).toBeUndefined()
      // tagsが配列でない → 空配列へ正規化（レコードは捨てない）
      expect(memo.tags).toEqual([])
    })

    it('保存例外を成功扱いにしない', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      })
      expect(repository.setTodos([sampleTodo()])).toBe(false)
      expect(repository.setMemos([sampleMemo()])).toBe(false)
    })
  })

  describe('記録データの初期化（resetRecordData）', () => {
    it('新旧の記録キーを消し、推し設定・テーマ・オンボは残す', () => {
      localStorage.setItem(TODO_KEY, JSON.stringify({ schemaVersion: 1, records: [sampleTodo()] }))
      localStorage.setItem(FRAGMENT_KEY, JSON.stringify({ schemaVersion: 1, records: [sampleMemo()] }))
      localStorage.setItem('planItems', JSON.stringify([{ text: '予定', time: '', cat: 'task' }]))
      localStorage.setItem('hlogs', JSON.stringify([]))
      localStorage.setItem('pstart', '2026-07-21T00:00:00.000Z')
      localStorage.setItem('pin', 'true')
      localStorage.setItem('oshi', JSON.stringify(DEFAULT_OSHI))
      localStorage.setItem('theme', 'dark')
      localStorage.setItem('obdone', '1')

      expect(repository.resetRecordData()).toBe(true)

      expect(localStorage.getItem(TODO_KEY)).toBeNull()
      expect(localStorage.getItem(FRAGMENT_KEY)).toBeNull()
      expect(localStorage.getItem('planItems')).toBeNull()
      expect(localStorage.getItem('hlogs')).toBeNull()
      expect(localStorage.getItem('pstart')).toBeNull()
      expect(localStorage.getItem('pin')).toBeNull()
      // 設定系は保持
      expect(localStorage.getItem('oshi')).not.toBeNull()
      expect(localStorage.getItem('theme')).toBe('dark')
      expect(localStorage.getItem('obdone')).toBe('1')
    })

    it('途中失敗を成功扱いにせず、可能な範囲でロールバックする', () => {
      localStorage.setItem(TODO_KEY, JSON.stringify({ schemaVersion: 1, records: [sampleTodo()] }))
      localStorage.setItem('planItems', JSON.stringify([{ text: '予定', time: '', cat: 'task' }]))
      const original = Storage.prototype.removeItem
      let calls = 0
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key: string) {
        calls += 1
        if (calls === 2) throw new DOMException('denied', 'SecurityError')
        return original.call(this, key)
      })

      expect(repository.resetRecordData()).toBe(false)
      // ロールバックで元の値が戻っている（少なくとも消えていない）
      expect(localStorage.getItem(TODO_KEY)).not.toBeNull()
      expect(localStorage.getItem('planItems')).not.toBeNull()
    })
  })
})

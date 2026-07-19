// 推し生活OS の状態集約。Vanilla版のグローバル変数＋命令的関数を React 状態駆動に移植。
// 挙動・コピーは保持。永続化は repo（Repository層）経由のみ。
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_OSHI, repo } from '../lib/repository'
import { DEFS, FREE_LIMITS, RESPONSES } from '../lib/constants'
import { tokyoShortDate } from '../lib/date'
import type {
  ChatRole,
  Extract,
  ExtractType,
  HealthLog,
  Memo,
  Oshi,
  PlanCat,
  PlanItem,
  PlanTier,
  Prio,
  Screen,
  Theme,
  Todo,
} from '../lib/types'

let _seq = 0
const nextId = () => `id${++_seq}`

export const STORAGE_FAILURE_MESSAGE =
  '保存できませんでした。空き容量やSafariの設定を確認して、もう一度お試しください。'

// チャットの表示要素（メッセージ / 入力中 / 保存候補カード）
export type ChatItem =
  | { id: string; kind: 'msg'; role: ChatRole; text: string }
  | { id: string; kind: 'typing' }
  | { id: string; kind: 'ext'; extract: Extract; state: 'open' | 'saved' }

interface AppState {
  // 基本
  owner: boolean
  dispName: (name?: string) => string
  theme: Theme
  toggleTheme: () => void
  screen: Screen
  setScreen: (s: Screen) => void
  obDone: boolean
  finishOnboarding: () => boolean
  // 推し
  oshi: Oshi
  saveOshi: (o: Oshi) => boolean
  previewAvatar: (img: string | null) => void
  // タスク
  todos: Todo[]
  addTodo: (text: string, due: string, prio: Prio) => boolean
  editTodo: (id: string, text: string, due: string, prio: Prio) => void
  toggleTodo: (id: string) => void
  deleteTodo: (id: string) => void
  // 会話のかけら（内部名 memo）
  memos: Memo[]
  addMemo: (text: string) => boolean
  editMemo: (idx: number, text: string) => void
  deleteMemo: (idx: number) => void
  // 予定
  planItems: PlanItem[]
  addPlanItem: (text: string, time: string, cat: PlanCat) => boolean
  deletePlanItem: (idx: number) => void
  // 体調
  healthLogs: HealthLog[]
  saveHealth: (log: HealthLog) => boolean
  periodStart: string | null
  inPeriod: boolean
  startPeriod: () => void
  endPeriod: () => void
  // お守り
  omamoriOn: boolean
  setOmamori: (v: boolean) => void
  // プラン（課金）
  planTier: PlanTier
  selectPlan: (t: PlanTier) => void
  // チャット
  chatItems: ChatItem[]
  sendChat: (text: string) => void
  saveCandidate: (id: string) => void
  skipCandidate: (id: string) => void
  // モーダル（ホーム/タスク/かけら から共通で開く）
  todoModal: { open: boolean; editingId: string | null }
  openTodoModal: (id?: string) => void
  closeTodoModal: () => void
  memoModal: { open: boolean; editingIdx: number | null }
  openMemoModal: (idx?: number) => void
  closeMemoModal: () => void
  planModal: { open: boolean }
  openPlanModal: () => void
  closePlanModal: () => void
  // 共通
  toast: string
  showToast: (msg: string) => void
  checkLimit: (type: ExtractType, current: number) => boolean
}

const Ctx = createContext<AppState | null>(null)

// owner はアプリ起動時に1度だけ確定（?owner=true で付与）。Vanilla版と同じ判定。
function resolveOwner(): boolean {
  try {
    const params = new URLSearchParams(location.search)
    if (params.get('owner') === 'true') repo.setOwner(true)
  } catch {
    /* no-op */
  }
  return repo.getOwner()
}

function initialTheme(): Theme {
  const saved = repo.getTheme()
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'
}

function getRes(text: string): { base: string; extract: Extract | null } {
  for (const r of RESPONSES) {
    if (r.trigger.some((t) => text.includes(t))) return { base: r.base, extract: r.extract }
  }
  return { base: DEFS[Math.floor(Math.random() * DEFS.length)], extract: null }
}

function buildReply(base: string, tone: string, omamoriOn: boolean): string {
  let r = base
  if (omamoriOn) r = r.replace('やらなきゃ', 'やれそうなら、で')
  if (tone === 'クール') r = r.replace(/よね/g, '').replace(/ね$/, '')
  if (tone === 'ツンデレ') r = `…別に心配してるわけじゃないけど。${r}`
  if (tone === '甘い') r = r + 'ね'
  if (tone === '明るい') r = r + '！'
  return r
}

export function AppProvider({ children }: { children: ReactNode }) {
  const owner = useMemo(resolveOwner, [])

  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [screen, setScreen] = useState<Screen>('home')
  const [obDone, setObDone] = useState<boolean>(() => repo.getOnboardingDone())
  const [oshi, setOshi] = useState<Oshi>(() => repo.getOshi() ?? DEFAULT_OSHI)

  const [todos, setTodos] = useState<Todo[]>([])
  const [memos, setMemos] = useState<Memo[]>([])
  const [planItems, setPlanItems] = useState<PlanItem[]>(
    () => repo.getPlanItems() ?? (owner ? SAMPLE_PLANS : []),
  )
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>(() => repo.getHealthLogs())
  const [periodStart, setPeriodStart] = useState<string | null>(() => repo.getPeriodStart())
  const [inPeriod, setInPeriod] = useState<boolean>(() => repo.getInPeriod())
  const [omamoriOn, setOmamoriOn] = useState<boolean>(false)
  const [planTier, setPlanTier] = useState<PlanTier>(() => repo.getPlanTier())

  const [chatItems, setChatItems] = useState<ChatItem[]>(() => [
    { id: nextId(), kind: 'msg', role: 'oshi', text: '今日どんな感じ？気になってること、雑に投げていいよ。' },
  ])

  const [toast, setToast] = useState<string>('')
  const toastTimer = useRef<number | undefined>(undefined)
  const savingCandidates = useRef<Set<string>>(new Set())

  const [todoModal, setTodoModal] = useState<{ open: boolean; editingId: string | null }>({
    open: false,
    editingId: null,
  })
  const openTodoModal = useCallback((id?: string) => setTodoModal({ open: true, editingId: id ?? null }), [])
  const closeTodoModal = useCallback(() => setTodoModal({ open: false, editingId: null }), [])

  const [memoModal, setMemoModal] = useState<{ open: boolean; editingIdx: number | null }>({
    open: false,
    editingIdx: null,
  })
  const openMemoModal = useCallback((idx?: number) => setMemoModal({ open: true, editingIdx: idx ?? null }), [])
  const closeMemoModal = useCallback(() => setMemoModal({ open: false, editingIdx: null }), [])

  const [planModal, setPlanModal] = useState<{ open: boolean }>({ open: false })
  const openPlanModal = useCallback(() => setPlanModal({ open: true }), [])
  const closePlanModal = useCallback(() => setPlanModal({ open: false }), [])

  // テーマ：documentElement に反映。永続化は切替時に成功を確認してから行う。
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // owner：body クラスで .owner-only の表示制御（CSS が参照）
  useEffect(() => {
    document.body.classList.toggle('is-owner', owner)
  }, [owner])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }, [])

  const showStorageFailure = useCallback(() => {
    showToast(STORAGE_FAILURE_MESSAGE)
  }, [showToast])

  const dispName = useCallback(
    (name?: string) => (owner ? name || '推し' : '◯◯'),
    [owner],
  )

  const checkLimit = useCallback(
    (type: ExtractType, current: number) => {
      if (owner) return true
      if (current >= FREE_LIMITS[type]) {
        showToast(`無料プランは${FREE_LIMITS[type]}件まで`)
        return false
      }
      return true
    },
    [owner, showToast],
  )

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    if (!repo.setTheme(next)) {
      showStorageFailure()
      return
    }
    setTheme(next)
  }, [showStorageFailure, theme])

  const finishOnboarding = useCallback(() => {
    if (!repo.setOnboardingDone(true)) {
      showStorageFailure()
      return false
    }
    setObDone(true)
    setScreen('settings')
    return true
  }, [showStorageFailure])

  const saveOshi = useCallback(
    (o: Oshi) => {
      if (!repo.setOshi(o)) {
        showStorageFailure()
        return false
      }
      setOshi(o)
      showToast(`${owner ? o.name || '推し' : '◯◯'}の設定を保存 🩵`)
      window.setTimeout(() => setScreen('home'), 700)
      return true
    },
    [owner, showStorageFailure, showToast],
  )

  // アバターの即時プレビュー（保存は saveOshi 時。Vanilla版 onSetAv の挙動）
  const previewAvatar = useCallback((img: string | null) => {
    setOshi((prev) => ({ ...prev, avatarImg: img }))
  }, [])

  // タスク（Vanilla版と同じくセッション内保持。永続化は会話のかけら基盤フェーズで対応）
  const addTodo = useCallback(
    (text: string, due: string, prio: Prio) => {
      if (omamoriOn && todos.length >= 3) {
        showToast('お守りモード中。3つまで 🧿')
        return false
      }
      setTodos([...todos, { id: nextId(), text, done: false, due, prio }])
      return true
    },
    [omamoriOn, showToast, todos],
  )
  const editTodo = useCallback((id: string, text: string, due: string, prio: Prio) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text, due, prio } : t)))
  }, [])
  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }, [])
  const deleteTodo = useCallback(
    (id: string) => {
      setTodos((prev) => prev.filter((t) => t.id !== id))
      showToast('削除したよ')
    },
    [showToast],
  )

  // 会話のかけら（memo）
  const addMemo = useCallback((text: string) => {
    setMemos((prev) => [{ text, date: tokyoShortDate() }, ...prev])
    return true
  }, [])
  const editMemo = useCallback((idx: number, text: string) => {
    setMemos((prev) => prev.map((m, i) => (i === idx ? { ...m, text } : m)))
  }, [])
  const deleteMemo = useCallback(
    (idx: number) => {
      setMemos((prev) => prev.filter((_, i) => i !== idx))
      showToast('削除したよ')
    },
    [showToast],
  )

  // 予定（永続化）
  const addPlanItem = useCallback(
    (text: string, time: string, cat: PlanCat) => {
      if (!owner && planItems.length >= FREE_LIMITS.plan) {
        showToast(`無料プランは${FREE_LIMITS.plan}件まで`)
        return false
      }
      const next = [...planItems, { text, time, cat }].sort((a, b) =>
        (a.time || '99:99').localeCompare(b.time || '99:99'),
      )
      if (!repo.setPlanItems(next)) {
        showStorageFailure()
        return false
      }
      setPlanItems(next)
      return true
    },
    [owner, planItems, showStorageFailure, showToast],
  )
  const deletePlanItem = useCallback(
    (idx: number) => {
      const next = planItems.filter((_, i) => i !== idx)
      if (!repo.setPlanItems(next)) {
        showStorageFailure()
        return
      }
      setPlanItems(next)
    },
    [planItems, showStorageFailure],
  )

  // 体調
  const saveHealth = useCallback(
    (log: HealthLog) => {
      const next = [log, ...healthLogs].slice(0, 30)
      if (!repo.setHealthLogs(next)) {
        showStorageFailure()
        return false
      }
      setHealthLogs(next)
      showToast('体調を記録 🩵')
      return true
    },
    [healthLogs, showStorageFailure, showToast],
  )
  const startPeriod = useCallback(() => {
    const s = new Date().toISOString()
    if (!repo.setPeriodState(s, true)) {
      showStorageFailure()
      return
    }
    setPeriodStart(s)
    setInPeriod(true)
    showToast('生理開始を記録 🩸')
  }, [showStorageFailure, showToast])
  const endPeriod = useCallback(() => {
    if (!repo.setPeriodState(periodStart, false)) {
      showStorageFailure()
      return
    }
    setInPeriod(false)
    showToast('お疲れさま 🩵')
  }, [periodStart, showStorageFailure, showToast])

  const setOmamori = useCallback(
    (v: boolean) => {
      setOmamoriOn(v)
      showToast(v ? 'お守りモードON 🧿' : 'お守りモードOFF')
    },
    [showToast],
  )

  const selectPlan = useCallback(
    (t: PlanTier) => {
      if (!repo.setPlanTier(t)) {
        showStorageFailure()
        return
      }
      setPlanTier(t)
      const labels: Record<PlanTier, string> = {
        free: '無料プラン',
        once: '体調管理パック',
        sub: 'お守りプラン',
      }
      showToast(labels[t] + ' に切替 🩵')
    },
    [showStorageFailure, showToast],
  )

  // チャット送信（Vanilla send() の移植：ユーザー発話→入力中→応答→保存候補）
  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const typingId = nextId()
      setChatItems((prev) => [
        ...prev,
        { id: nextId(), kind: 'msg', role: 'user', text: trimmed },
        { id: typingId, kind: 'typing' },
      ])
      const delay = 600 + Math.random() * 400
      window.setTimeout(() => {
        const res = getRes(trimmed)
        const reply = buildReply(res.base, oshi.tone || 'やさしい', omamoriOn)
        setChatItems((prev) => [
          ...prev.filter((it) => it.id !== typingId),
          { id: nextId(), kind: 'msg', role: 'oshi', text: reply },
        ])
        if (res.extract) {
          const ex = res.extract
          window.setTimeout(() => {
            setChatItems((prev) => [
              ...prev,
              { id: nextId(), kind: 'ext', extract: ex, state: 'open' },
            ])
          }, 300)
        }
      }, delay)
    },
    [oshi.tone, omamoriOn],
  )

  // 保存候補を「保存」＝ユーザー確認後にだけ保存する（自動保存しない）
  const saveCandidate = useCallback(
    (id: string) => {
      if (savingCandidates.current.has(id)) return
      const item = chatItems.find((it) => it.id === id)
      if (!item || item.kind !== 'ext' || item.state !== 'open') return

      savingCandidates.current.add(id)
      const { type, text } = item.extract
      if (type === 'plan') {
        const next = [...planItems, { text, time: '', cat: 'task' as PlanCat }]
        if (!repo.setPlanItems(next)) {
          savingCandidates.current.delete(id)
          showStorageFailure()
          return
        }
        setPlanItems(next)
      } else if (type === 'todo') {
        setTodos((current) => [
          ...current,
          { id: nextId(), text, done: false, due: '', prio: 'low' },
        ])
      } else {
        setMemos((current) => [{ text, date: tokyoShortDate() }, ...current])
      }

      setChatItems((current) =>
        current.map((chatItem) =>
          chatItem.id === id && chatItem.kind === 'ext'
            ? { ...chatItem, state: 'saved' }
            : chatItem,
        ),
      )
      showToast(type === 'memo' ? '会話のかけらに残しました' : '保存したよ')
      window.setTimeout(() => {
        setChatItems((current) => current.filter((chatItem) => chatItem.id !== id))
        savingCandidates.current.delete(id)
      }, 500)
    },
    [chatItems, planItems, showStorageFailure, showToast],
  )
  const skipCandidate = useCallback((id: string) => {
    setChatItems((prev) => prev.filter((it) => it.id !== id))
  }, [])

  const value: AppState = {
    owner,
    dispName,
    theme,
    toggleTheme,
    screen,
    setScreen,
    obDone,
    finishOnboarding,
    oshi,
    saveOshi,
    previewAvatar,
    todos,
    addTodo,
    editTodo,
    toggleTodo,
    deleteTodo,
    memos,
    addMemo,
    editMemo,
    deleteMemo,
    planItems,
    addPlanItem,
    deletePlanItem,
    healthLogs,
    saveHealth,
    periodStart,
    inPeriod,
    startPeriod,
    endPeriod,
    omamoriOn,
    setOmamori,
    planTier,
    selectPlan,
    chatItems,
    sendChat,
    saveCandidate,
    skipCandidate,
    todoModal,
    openTodoModal,
    closeTodoModal,
    memoModal,
    openMemoModal,
    closeMemoModal,
    planModal,
    openPlanModal,
    closePlanModal,
    toast,
    showToast,
    checkLimit,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used within AppProvider')
  return v
}

// owner モード初期サンプル予定（個人情報なし・Vanilla版と同一）
const SAMPLE_PLANS: PlanItem[] = [
  { text: '作業', time: '10:00', cat: 'task' },
  { text: '買い物', time: '14:00', cat: 'care' },
  { text: '配信を見る', time: '20:00', cat: 'fun' },
]

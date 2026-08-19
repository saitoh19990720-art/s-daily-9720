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
import { DEFAULT_OSHI, FRAGMENT_SCHEMA_VERSION, repo } from '../lib/repository'
import type { Alarm } from '../lib/types'
import { DEFS, FREE_LIMITS, RESPONSES } from '../lib/constants'
import { tokyoShortDate } from '../lib/date'
import { sanitizeTags, tagsEqual } from '../lib/tags'
import type {
  ChatMsg,
  ChatRole,
  Extract,
  ExtractType,
  HealthLog,
  Memo,
  OrganizeTab,
  Oshi,
  PlanCat,
  PlanItem,
  PlanTier,
  Prio,
  Screen,
  Theme,
  ThemePreference,
  Todo,
} from '../lib/types'

let _seq = 0
// チャット表示など、永続化しない一時要素用のID。
const nextId = () => `id${++_seq}`

let _rseq = 0
// 永続化するタスク／かけら用のID。Date.now()で再読み込み後も衝突しないようにする
// （リロードで _seq がリセットされても、保存済みIDと被らせない）。
const makeRecordId = () => `r-${Date.now().toString(36)}-${(++_rseq).toString(36)}`

export const STORAGE_FAILURE_MESSAGE =
  '保存できませんでした。空き容量やSafariの設定を確認して、もう一度お試しください。'

// かけら更新の結果：保存した / 変更がなく保存不要 / 失敗。
export type MemoUpdateResult = 'saved' | 'unchanged' | 'error'

// チャットの表示要素（メッセージ / 入力中 / 保存候補カード）
// ext.source = 候補を生んだ元会話の最小スナップショット（かけら保存時に origin として引き継ぐ）。
export type ChatItem =
  | { id: string; kind: 'msg'; role: ChatRole; text: string }
  | { id: string; kind: 'typing' }
  | { id: string; kind: 'ext'; extract: Extract; state: 'open' | 'saved'; source?: ChatMsg[] }

/** アバター保存の結果。stale＝より新しい画像が選ばれたので捨てた。 */
export type AvatarSaveResult = 'saved' | 'stale' | 'failed'

interface AppState {
  // 基本
  owner: boolean
  dispName: (name?: string) => string
  theme: Theme
  themePreference: ThemePreference
  toggleTheme: () => void
  screen: Screen
  setScreen: (s: Screen) => void
  organizeTab: OrganizeTab
  setOrganizeTab: (tab: OrganizeTab) => void
  obDone: boolean
  finishOnboarding: () => boolean
  // 推し
  oshi: Oshi
  saveOshi: (o: Oshi) => boolean
  // 画像選択の世代管理。Settingsを離れて戻っても同じ世代列を使う。
  beginAvatarSelection: () => number
  isLatestAvatarSelection: (requestId: number) => boolean
  saveAvatar: (
    img: string | null,
    requestId: number,
    options?: { shouldNotifyFailure?: () => boolean },
  ) => AvatarSaveResult
  // タスク
  todos: Todo[]
  addTodo: (text: string, due: string, prio: Prio) => boolean
  editTodo: (id: string, text: string, due: string, prio: Prio) => boolean
  toggleTodo: (id: string) => void
  deleteTodo: (id: string) => void
  // 会話のかけら（内部名 memo）
  memos: Memo[]
  addMemo: (text: string) => boolean
  editMemo: (idx: number, text: string) => boolean
  deleteMemo: (idx: number) => void
  // ③-B-2：詳細から id 指定で本文＋タグを更新／削除する。
  updateMemo: (id: string, text: string, tags: string[]) => MemoUpdateResult
  deleteMemoById: (id: string) => boolean
  fragmentDetail: { open: boolean; id: string | null }
  openFragmentDetail: (id: string) => void
  closeFragmentDetail: () => void
  // 予定
  planItems: PlanItem[]
  addPlanItem: (text: string, time: string, cat: PlanCat) => boolean
  editPlanItem: (idx: number, text: string, time: string, cat: PlanCat) => boolean
  deletePlanItem: (idx: number) => void
  // 体調
  healthLogs: HealthLog[]
  saveHealth: (log: HealthLog) => boolean
  periodStart: string | null
  inPeriod: boolean
  startPeriod: () => void
  endPeriod: () => void
  // アラーム（v0.1は1件・scheduled表示とON/OFFのみ）
  alarm: Alarm
  setAlarmEnabled: (enabled: boolean) => void
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
  planModal: { open: boolean; editingIdx: number | null }
  openPlanModal: (idx?: number) => void
  closePlanModal: () => void
  // データ管理
  resetRecordData: () => boolean
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

const systemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'

interface RouteState {
  screen: Screen
  organizeTab: OrganizeTab
}

const ORGANIZE_TABS: readonly OrganizeTab[] = ['tasks', 'fragments', 'schedule']

function readRoute(): RouteState {
  const [route = '', subroute = ''] = window.location.hash.replace(/^#\/?/, '').split('/')
  if (route === 'todo') return { screen: 'organize', organizeTab: 'tasks' }
  if (route === 'memo') return { screen: 'organize', organizeTab: 'fragments' }
  if (route === 'planlist') return { screen: 'organize', organizeTab: 'schedule' }
  if (route === 'organize') {
    const organizeTab = ORGANIZE_TABS.includes(subroute as OrganizeTab)
      ? (subroute as OrganizeTab)
      : 'tasks'
    return { screen: 'organize', organizeTab }
  }
  if (route === 'chat' || route === 'health' || route === 'plan' || route === 'settings') {
    return { screen: route, organizeTab: 'tasks' }
  }
  return { screen: 'home', organizeTab: 'tasks' }
}

function routeHash(screen: Screen, organizeTab: OrganizeTab): string {
  return screen === 'organize' ? `#/organize/${organizeTab}` : `#/${screen}`
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
  const initialRoute = useMemo(readRoute, [])

  const [themePreference, setThemePreference] = useState<ThemePreference>(
    () => repo.getTheme() ?? 'system',
  )
  const [systemThemeValue, setSystemThemeValue] = useState<Theme>(systemTheme)
  const theme: Theme = themePreference === 'system' ? systemThemeValue : themePreference
  const [screen, setScreenState] = useState<Screen>(initialRoute.screen)
  const [organizeTab, setOrganizeTabState] = useState<OrganizeTab>(initialRoute.organizeTab)
  const [obDone, setObDone] = useState<boolean>(() => repo.getOnboardingDone())
  const [oshi, setOshi] = useState<Oshi>(() => repo.getOshi() ?? DEFAULT_OSHI)
  // 保存に成功した最新のOshi。非同期処理（画像圧縮）中に他の保存が入っても
  // 古いクロージャ値で上書きしないため、保存成功時だけ state と同時に更新する。
  const oshiRef = useRef<Oshi>(oshi)

  const [todos, setTodos] = useState<Todo[]>(() => repo.getTodos())
  const [memos, setMemos] = useState<Memo[]>(() => repo.getMemos())
  const [planItems, setPlanItems] = useState<PlanItem[]>(
    () => repo.getPlanItems() ?? (owner ? SAMPLE_PLANS : []),
  )
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>(() => repo.getHealthLogs())
  const [periodStart, setPeriodStart] = useState<string | null>(() => repo.getPeriodStart())
  const [inPeriod, setInPeriod] = useState<boolean>(() => repo.getInPeriod())
  const [alarm, setAlarm] = useState<Alarm>(() => repo.getAlarm())
  const [omamoriOn, setOmamoriOn] = useState<boolean>(false)
  const [planTier, setPlanTier] = useState<PlanTier>(() => repo.getPlanTier())

  const setScreen = useCallback(
    (nextScreen: Screen) => {
      if (nextScreen === screen) return
      setScreenState(nextScreen)
      window.history.pushState(null, '', routeHash(nextScreen, organizeTab))
    },
    [organizeTab, screen],
  )

  const setOrganizeTab = useCallback(
    (nextTab: OrganizeTab) => {
      if (screen === 'organize' && nextTab === organizeTab) return
      setScreenState('organize')
      setOrganizeTabState(nextTab)
      window.history.pushState(null, '', routeHash('organize', nextTab))
    },
    [organizeTab, screen],
  )

  useEffect(() => {
    const applyRoute = () => {
      const next = readRoute()
      const canonicalHash = routeHash(next.screen, next.organizeTab)
      if (window.location.hash !== canonicalHash) {
        window.history.replaceState(null, '', canonicalHash)
      }
      setScreenState(next.screen)
      setOrganizeTabState(next.organizeTab)
    }
    const canonicalHash = routeHash(initialRoute.screen, initialRoute.organizeTab)
    if (window.location.hash !== canonicalHash) {
      window.history.replaceState(null, '', canonicalHash)
    }
    window.addEventListener('popstate', applyRoute)
    window.addEventListener('hashchange', applyRoute)
    return () => {
      window.removeEventListener('popstate', applyRoute)
      window.removeEventListener('hashchange', applyRoute)
    }
  }, [initialRoute])

  const [chatItems, setChatItems] = useState<ChatItem[]>(() => [
    { id: nextId(), kind: 'msg', role: 'oshi', text: '今日どんな感じ？気になってること、雑に投げていいよ。' },
  ])

  const [toast, setToast] = useState<string>('')
  const toastTimer = useRef<number | undefined>(undefined)
  const savingCandidates = useRef<Set<string>>(new Set())
  const memoMutationIds = useRef<Set<string>>(new Set())

  // 更新・削除成功後、次のstateが反映された時点で同一IDの連打ロックを解除する。
  useEffect(() => {
    memoMutationIds.current.clear()
  }, [memos])

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

  // ③-B-2：かけら詳細（id指定で開く）。
  const [fragmentDetail, setFragmentDetail] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  })
  const openFragmentDetail = useCallback((id: string) => setFragmentDetail({ open: true, id }), [])
  const closeFragmentDetail = useCallback(() => setFragmentDetail({ open: false, id: null }), [])

  const [planModal, setPlanModal] = useState<{ open: boolean; editingIdx: number | null }>({
    open: false,
    editingIdx: null,
  })
  const openPlanModal = useCallback(
    (idx?: number) => setPlanModal({ open: true, editingIdx: idx ?? null }),
    [],
  )
  const closePlanModal = useCallback(() => setPlanModal({ open: false, editingIdx: null }), [])

  // テーマ：documentElement に反映。永続化は切替時に成功を確認してから行う。
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme:dark)')
    const update = (event: MediaQueryListEvent | MediaQueryList) =>
      setSystemThemeValue(event.matches ? 'dark' : 'light')
    update(query)
    if (themePreference !== 'system') return
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [themePreference])

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
    const next: ThemePreference =
      themePreference === 'light' ? 'dark' : themePreference === 'dark' ? 'system' : 'light'
    if (!repo.setTheme(next)) {
      showStorageFailure()
      return
    }
    setThemePreference(next)
  }, [showStorageFailure, themePreference])

  const finishOnboarding = useCallback(() => {
    if (!repo.setOnboardingDone(true)) {
      showStorageFailure()
      return false
    }
    setObDone(true)
    setScreen('settings')
    return true
  }, [setScreen, showStorageFailure])

  const saveOshi = useCallback(
    (o: Oshi) => {
      if (!repo.setOshi(o)) {
        showStorageFailure()
        return false
      }
      oshiRef.current = o
      setOshi(o)
      showToast(`${owner ? o.name || '推し' : '◯◯'}の設定を保存 🩵`)
      window.setTimeout(() => setScreen('home'), 700)
      return true
    },
    [owner, setScreen, showStorageFailure, showToast],
  )

  // 画像選択の世代。Settings（画面）ではなくProviderが持つので、
  // 設定画面を離れて戻っても「最後に選んだ画像」だけが勝つ。
  const avatarRequestRef = useRef(0)
  const beginAvatarSelection = useCallback(() => ++avatarRequestRef.current, [])
  const isLatestAvatarSelection = useCallback(
    (requestId: number) => requestId === avatarRequestRef.current,
    [],
  )

  // アバターは選んだ時点で永続化する。保存成功後だけ画面へ反映し、
  // 「見えているのに再読み込みで消える」状態を作らない。
  // 圧縮完了時の“今”の保存済み設定（oshiRef.current）へ avatarImg だけを重ねるので、
  // 圧縮待ちの間に名前などを保存されても、その保存を巻き戻さない。
  // 失敗通知を出すかどうかは、失敗が確定した時点で呼び出し側に判定させる。
  const saveAvatar = useCallback(
    (
      img: string | null,
      requestId: number,
      options?: { shouldNotifyFailure?: () => boolean },
    ): AvatarSaveResult => {
      if (requestId !== avatarRequestRef.current) return 'stale'
      const next = { ...oshiRef.current, avatarImg: img }
      if (!repo.setOshi(next)) {
        if (options?.shouldNotifyFailure?.() ?? true) showStorageFailure()
        return 'failed'
      }
      oshiRef.current = next
      setOshi(next)
      return 'saved'
    },
    [showStorageFailure],
  )

  // タスク（③-B-1で永続化）。追加・編集・完了・削除いずれも「保存成功後だけ」stateを更新する。
  // 保存はRepository層に集約し、state updater内でlocalStorageや別stateを触らない。
  const addTodo = useCallback(
    (text: string, due: string, prio: Prio) => {
      if (omamoriOn && todos.length >= 3) {
        showToast('お守りモード中。3つまで 🧿')
        return false
      }
      const now = new Date().toISOString()
      const next = [...todos, { id: makeRecordId(), text, done: false, due, prio, createdAt: now, updatedAt: now }]
      if (!repo.setTodos(next)) {
        showStorageFailure()
        return false
      }
      setTodos(next)
      return true
    },
    [omamoriOn, showStorageFailure, showToast, todos],
  )
  const editTodo = useCallback(
    (id: string, text: string, due: string, prio: Prio) => {
      if (!todos.some((t) => t.id === id)) return false
      const next = todos.map((t) =>
        t.id === id ? { ...t, text, due, prio, updatedAt: new Date().toISOString() } : t,
      )
      if (!repo.setTodos(next)) {
        showStorageFailure()
        return false
      }
      setTodos(next)
      return true
    },
    [showStorageFailure, todos],
  )
  const toggleTodo = useCallback(
    (id: string) => {
      if (!todos.some((t) => t.id === id)) return
      const next = todos.map((t) =>
        t.id === id ? { ...t, done: !t.done, updatedAt: new Date().toISOString() } : t,
      )
      // 即時操作でも保存に失敗したら画面は変えない（成功扱いにしない）。
      if (!repo.setTodos(next)) {
        showStorageFailure()
        return
      }
      setTodos(next)
    },
    [showStorageFailure, todos],
  )
  const deleteTodo = useCallback(
    (id: string) => {
      if (!todos.some((t) => t.id === id)) return
      const next = todos.filter((t) => t.id !== id)
      if (!repo.setTodos(next)) {
        showStorageFailure()
        return
      }
      setTodos(next)
      showToast('削除したよ')
    },
    [showStorageFailure, showToast, todos],
  )

  // 会話のかけら（memo）。③-B-1で永続化＋バージョン付き構造。手入力は source='manual'／origin=[]。
  const addMemo = useCallback(
    (text: string) => {
      const now = new Date()
      const memo: Memo = {
        id: makeRecordId(),
        text,
        date: tokyoShortDate(now),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        source: 'manual',
        origin: [],
        tags: [],
        schemaVersion: FRAGMENT_SCHEMA_VERSION,
      }
      const next = [memo, ...memos]
      if (!repo.setMemos(next)) {
        showStorageFailure()
        return false
      }
      setMemos(next)
      return true
    },
    [memos, showStorageFailure],
  )
  const editMemo = useCallback(
    (idx: number, text: string) => {
      if (!memos[idx]) return false
      const next = memos.map((m, i) =>
        i === idx ? { ...m, text, updatedAt: new Date().toISOString() } : m,
      )
      if (!repo.setMemos(next)) {
        showStorageFailure()
        return false
      }
      setMemos(next)
      return true
    },
    [memos, showStorageFailure],
  )
  const deleteMemo = useCallback(
    (idx: number) => {
      if (!memos[idx]) return
      const next = memos.filter((_, i) => i !== idx)
      if (!repo.setMemos(next)) {
        showStorageFailure()
        return
      }
      setMemos(next)
      showToast('削除したよ')
    },
    [memos, showStorageFailure, showToast],
  )

  // ③-B-2：id指定で本文＋タグを更新。id/createdAt/source/origin/schemaVersion/date は維持し、
  // 変更があるときだけ保存＆updatedAt更新。保存成功後だけstateを更新（updater内でlocalStorageを触らない）。
  // 更新はid基準の置換なので、連打・二重実行でもレコードは重複しない（追加と違い冪等）。
  const updateMemo = useCallback(
    (id: string, text: string, tags: string[]): MemoUpdateResult => {
      const target = memos.find((m) => m.id === id)
      if (!target) return 'error'
      const trimmed = text.trim()
      if (!trimmed) return 'error'
      const nextTags = sanitizeTags(tags)
      // 本文・タグとも変化なし → 不要な保存をしない（updatedAtも変えない）。
      if (trimmed === target.text && tagsEqual(nextTags, target.tags)) return 'unchanged'
      if (memoMutationIds.current.has(id)) return 'unchanged'
      memoMutationIds.current.add(id)
      const next = memos.map((m) =>
        m.id === id ? { ...m, text: trimmed, tags: nextTags, updatedAt: new Date().toISOString() } : m,
      )
      if (!repo.setMemos(next)) {
        memoMutationIds.current.delete(id)
        showStorageFailure()
        return 'error'
      }
      setMemos(next)
      return 'saved'
    },
    [memos, showStorageFailure],
  )
  const deleteMemoById = useCallback(
    (id: string) => {
      if (!memos.some((m) => m.id === id)) return false
      if (memoMutationIds.current.has(id)) return false
      memoMutationIds.current.add(id)
      const next = memos.filter((m) => m.id !== id)
      if (!repo.setMemos(next)) {
        memoMutationIds.current.delete(id)
        showStorageFailure()
        return false
      }
      setMemos(next)
      return true
    },
    [memos, showStorageFailure],
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
  const editPlanItem = useCallback(
    (idx: number, text: string, time: string, cat: PlanCat) => {
      if (!planItems[idx]) return false
      const next = planItems
        .map((item, itemIdx) => (itemIdx === idx ? { text, time, cat } : item))
        .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
      if (!repo.setPlanItems(next)) {
        showStorageFailure()
        return false
      }
      setPlanItems(next)
      return true
    },
    [planItems, showStorageFailure],
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

  // アラームのON/OFF。保存に成功したときだけ画面へ反映する（他の保存と同じ扱い）。
  const setAlarmEnabled = useCallback(
    (enabled: boolean) => {
      if (enabled === alarm.enabled) return
      const next: Alarm = { ...alarm, enabled }
      if (!repo.setAlarm(next)) {
        showStorageFailure()
        return
      }
      setAlarm(next)
    },
    [alarm, showStorageFailure],
  )

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
          // 候補を生んだ元会話（ユーザー発言＋AI応答）だけをスナップショットとして保持する。
          const snapshot: ChatMsg[] = [
            { role: 'user', content: trimmed },
            { role: 'oshi', content: reply },
          ]
          window.setTimeout(() => {
            setChatItems((prev) => [
              ...prev,
              { id: nextId(), kind: 'ext', extract: ex, state: 'open', source: snapshot },
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
        const now = new Date().toISOString()
        const next = [
          ...todos,
          { id: makeRecordId(), text, done: false, due: '', prio: 'low' as Prio, createdAt: now, updatedAt: now },
        ]
        if (!repo.setTodos(next)) {
          savingCandidates.current.delete(id)
          showStorageFailure()
          return
        }
        setTodos(next)
      } else {
        const now = new Date()
        const memo: Memo = {
          id: makeRecordId(),
          text,
          date: tokyoShortDate(now),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          source: 'chat',
          // 元会話の最小スナップショット（無ければ空）。参照IDだけにしない。
          origin: item.source ?? [],
          tags: [],
          schemaVersion: FRAGMENT_SCHEMA_VERSION,
        }
        const next = [memo, ...memos]
        if (!repo.setMemos(next)) {
          savingCandidates.current.delete(id)
          showStorageFailure()
          return
        }
        setMemos(next)
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
    [chatItems, memos, planItems, showStorageFailure, showToast, todos],
  )
  const skipCandidate = useCallback((id: string) => {
    setChatItems((prev) => prev.filter((it) => it.id !== id))
  }, [])

  // データ初期化（記録データ）：タスク/かけら/予定/体調をまとめて消す。
  // 全削除が成功したときだけ画面stateを初期状態へ戻す（＝リロード直後と同じ見え方）。
  // 途中失敗はRepositoryがロールバックし false を返すので、成功表示・state変更をしない。
  const resetRecordData = useCallback(() => {
    if (!repo.resetRecordData()) {
      showStorageFailure()
      return false
    }
    setTodos([])
    setMemos([])
    setPlanItems(owner ? SAMPLE_PLANS : [])
    setHealthLogs([])
    setPeriodStart(null)
    setInPeriod(false)
    showToast('記録データを初期化しました')
    return true
  }, [owner, showStorageFailure, showToast])

  const value: AppState = {
    owner,
    dispName,
    theme,
    themePreference,
    toggleTheme,
    screen,
    setScreen,
    organizeTab,
    setOrganizeTab,
    obDone,
    finishOnboarding,
    oshi,
    saveOshi,
    beginAvatarSelection,
    isLatestAvatarSelection,
    saveAvatar,
    todos,
    addTodo,
    editTodo,
    toggleTodo,
    deleteTodo,
    memos,
    addMemo,
    editMemo,
    deleteMemo,
    updateMemo,
    deleteMemoById,
    fragmentDetail,
    openFragmentDetail,
    closeFragmentDetail,
    planItems,
    addPlanItem,
    editPlanItem,
    deletePlanItem,
    healthLogs,
    saveHealth,
    periodStart,
    inPeriod,
    startPeriod,
    endPeriod,
    alarm,
    setAlarmEnabled,
    omamoriOn,
    setOmamori,
    planTier,
    selectPlan,
    chatItems,
    sendChat,
    saveCandidate,
    skipCandidate,
    resetRecordData,
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

// 永続化はこの Repository 層に閉じ込める。将来 Supabase 等へ差し替え可能にするため、
// 画面/状態コードは localStorage を直接触らない（しずくの実装方針）。
// Vanilla版からの既存キーは変更せず引き継ぎ、③-B-1の新規データだけ名前空間付きキーへ保存する。
import type {
  ChatMsg,
  HealthLog,
  Memo,
  MemoSource,
  Oshi,
  PlanCat,
  PlanItem,
  PlanTier,
  Prio,
  ThemePreference,
  Todo,
} from './types'

const KEYS = {
  owner: 'oshi-os-owner',
  theme: 'theme',
  oshi: 'oshi',
  obdone: 'obdone',
  planItems: 'planItems',
  hlogs: 'hlogs',
  pstart: 'pstart',
  pin: 'pin',
  plan: 'plan',
  // ③-B-1で追加。名前空間+バージョン付き＝既存キー(oshi-os-owner/theme/oshi/…)と衝突しない。
  todos: 'oshi-os:v1:todos',
  fragments: 'oshi-os:v1:fragments',
} as const

// 保存形式のスキーマ版（ルート = { schemaVersion, records: [...] }）。
export const TODO_SCHEMA_VERSION = 1
export const FRAGMENT_SCHEMA_VERSION = 1

// 「データ初期化（記録データ）」で消すキー。推し設定/テーマ/オンボ/プランは残す。
const RECORD_KEYS: readonly string[] = [
  KEYS.todos,
  KEYS.fragments,
  KEYS.planItems,
  KEYS.hlogs,
  KEYS.pstart,
  KEYS.pin,
]

export const DEFAULT_OSHI: Oshi = {
  name: '推し',
  callname: 'きみ',
  relation: '推し',
  tone: 'やさしい',
  first: '',
  second: '',
  nowords: '',
  core: '',
  banned: '',
  avatarImg: null,
}

export interface Repository {
  getOwner(): boolean
  setOwner(v: boolean): boolean

  getTheme(): ThemePreference | null
  setTheme(t: ThemePreference): boolean

  getOshi(): Oshi | null
  setOshi(o: Oshi): boolean

  getOnboardingDone(): boolean
  setOnboardingDone(v: boolean): boolean

  getPlanItems(): PlanItem[] | null
  setPlanItems(items: PlanItem[]): boolean

  getHealthLogs(): HealthLog[]
  setHealthLogs(logs: HealthLog[]): boolean

  getPeriodStart(): string | null
  setPeriodStart(s: string | null): boolean

  getInPeriod(): boolean
  setInPeriod(v: boolean): boolean
  setPeriodState(s: string | null, inPeriod: boolean): boolean

  getPlanTier(): PlanTier
  setPlanTier(t: PlanTier): boolean

  // ③-B-1で追加：タスク／会話のかけらの永続化と、記録データの初期化。
  getTodos(): Todo[]
  setTodos(todos: Todo[]): boolean

  getMemos(): Memo[]
  setMemos(memos: Memo[]): boolean

  // 記録データ（タスク/かけら/予定/体調）を全削除。全成功時のみ true。
  // 途中失敗時は可能な範囲で保存前へロールバックし false を返す（＝成功扱いにしない）。
  resetRecordData(): boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

function isOshi(value: unknown): value is Oshi {
  if (!isRecord(value)) return false
  return (
    isString(value.name) &&
    isString(value.callname) &&
    isString(value.relation) &&
    isString(value.tone) &&
    isString(value.first) &&
    isString(value.second) &&
    isString(value.nowords) &&
    isString(value.core) &&
    isString(value.banned) &&
    (value.avatarImg === null || isString(value.avatarImg))
  )
}

const PLAN_CATS: readonly PlanCat[] = ['task', 'fun', 'care', 'rest']

function isPlanItem(value: unknown): value is PlanItem {
  if (!isRecord(value)) return false
  return (
    isString(value.text) &&
    isString(value.time) &&
    isString(value.cat) &&
    PLAN_CATS.includes(value.cat as PlanCat)
  )
}

function isHealthLog(value: unknown): value is HealthLog {
  if (!isRecord(value)) return false
  return (
    isString(value.date) &&
    isString(value.mood) &&
    isString(value.pain) &&
    isString(value.tags) &&
    isString(value.memo) &&
    typeof value.period === 'boolean'
  )
}

const PRIOS: readonly Prio[] = ['high', 'mid', 'low']

// タスクの必須項目（id/text/done/due/prio）だけを厳密判定。日時などの任意項目は別途正規化する。
function isTodoCore(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.text) &&
    typeof value.done === 'boolean' &&
    isString(value.due) &&
    isString(value.prio) &&
    PRIOS.includes(value.prio as Prio)
  )
}

const MEMO_SOURCES: readonly MemoSource[] = ['chat', 'manual']

function isChatMsg(value: unknown): value is ChatMsg {
  return isRecord(value) && isString(value.content) && (value.role === 'user' || value.role === 'oshi')
}

// 会話のかけらの必須項目（同一性・保存元・日時）だけを厳密判定。
// origin/tags/schemaVersion は欠損しても壊さないよう、読み込み時に正規化する（レコード自体は捨てない）。
function isMemoCore(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.text) &&
    isString(value.date) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    isString(value.source) &&
    MEMO_SOURCES.includes(value.source as MemoSource)
  )
}

// ルート構造 { schemaVersion, records: [...] } から records 配列だけを安全に取り出す。
// 破損JSON・非オブジェクト・records非配列は空配列へ復旧する。
function readRecordArray(key: string): unknown[] {
  const value = readJSON(key)
  if (!isRecord(value) || !Array.isArray(value.records)) return []
  return value.records
}

function readString(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function readJSON(key: string): unknown | null {
  const raw = readString(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function writeStorage(action: () => void): boolean {
  try {
    action()
    return true
  } catch {
    return false
  }
}

export class LocalStorageRepository implements Repository {
  getOwner(): boolean {
    return readString(KEYS.owner) === 'true'
  }
  setOwner(v: boolean): boolean {
    return writeStorage(() => localStorage.setItem(KEYS.owner, v ? 'true' : 'false'))
  }

  getTheme(): ThemePreference | null {
    const t = readString(KEYS.theme)
    return t === 'dark' || t === 'light' || t === 'system' ? t : null
  }
  setTheme(t: ThemePreference): boolean {
    return writeStorage(() => localStorage.setItem(KEYS.theme, t))
  }

  getOshi(): Oshi | null {
    const value = readJSON(KEYS.oshi)
    return isOshi(value) ? value : null
  }
  setOshi(o: Oshi): boolean {
    return writeStorage(() => localStorage.setItem(KEYS.oshi, JSON.stringify(o)))
  }

  getOnboardingDone(): boolean {
    return !!readString(KEYS.obdone)
  }
  setOnboardingDone(v: boolean): boolean {
    return writeStorage(() => {
      if (v) localStorage.setItem(KEYS.obdone, '1')
      else localStorage.removeItem(KEYS.obdone)
    })
  }

  getPlanItems(): PlanItem[] | null {
    const value = readJSON(KEYS.planItems)
    if (!Array.isArray(value)) return null
    return value.filter(isPlanItem)
  }
  setPlanItems(items: PlanItem[]): boolean {
    return writeStorage(() => localStorage.setItem(KEYS.planItems, JSON.stringify(items)))
  }

  getHealthLogs(): HealthLog[] {
    const value = readJSON(KEYS.hlogs)
    if (!Array.isArray(value)) return []
    return value.filter(isHealthLog)
  }
  setHealthLogs(logs: HealthLog[]): boolean {
    return writeStorage(() => localStorage.setItem(KEYS.hlogs, JSON.stringify(logs)))
  }

  getPeriodStart(): string | null {
    const value = readString(KEYS.pstart)
    return value && !Number.isNaN(Date.parse(value)) ? value : null
  }
  setPeriodStart(s: string | null): boolean {
    return writeStorage(() => {
      if (s) localStorage.setItem(KEYS.pstart, s)
      else localStorage.removeItem(KEYS.pstart)
    })
  }

  getInPeriod(): boolean {
    return readString(KEYS.pin) === 'true'
  }
  setInPeriod(v: boolean): boolean {
    return writeStorage(() => localStorage.setItem(KEYS.pin, v ? 'true' : 'false'))
  }

  setPeriodState(s: string | null, inPeriod: boolean): boolean {
    const previousStart = readString(KEYS.pstart)
    const previousInPeriod = readString(KEYS.pin)
    try {
      if (s) localStorage.setItem(KEYS.pstart, s)
      else localStorage.removeItem(KEYS.pstart)
      localStorage.setItem(KEYS.pin, inPeriod ? 'true' : 'false')
      return true
    } catch {
      // 2キー目で失敗した場合も、可能な限り保存前の組み合わせへ戻す。
      writeStorage(() => {
        if (previousStart === null) localStorage.removeItem(KEYS.pstart)
        else localStorage.setItem(KEYS.pstart, previousStart)
        if (previousInPeriod === null) localStorage.removeItem(KEYS.pin)
        else localStorage.setItem(KEYS.pin, previousInPeriod)
      })
      return false
    }
  }

  getPlanTier(): PlanTier {
    const p = readString(KEYS.plan)
    return p === 'once' || p === 'sub' ? p : 'free'
  }
  setPlanTier(t: PlanTier): boolean {
    return writeStorage(() => localStorage.setItem(KEYS.plan, t))
  }

  getTodos(): Todo[] {
    const out: Todo[] = []
    for (const rec of readRecordArray(KEYS.todos)) {
      if (!isTodoCore(rec)) continue
      // 未知フィールドは持ち込まず、既知の項目だけで再構築する。
      const todo: Todo = {
        id: rec.id as string,
        text: rec.text as string,
        done: rec.done as boolean,
        due: rec.due as string,
        prio: rec.prio as Prio,
      }
      if (isString(rec.createdAt)) todo.createdAt = rec.createdAt
      if (isString(rec.updatedAt)) todo.updatedAt = rec.updatedAt
      out.push(todo)
    }
    return out
  }
  setTodos(todos: Todo[]): boolean {
    return writeStorage(() =>
      localStorage.setItem(
        KEYS.todos,
        JSON.stringify({ schemaVersion: TODO_SCHEMA_VERSION, records: todos }),
      ),
    )
  }

  getMemos(): Memo[] {
    const out: Memo[] = []
    for (const rec of readRecordArray(KEYS.fragments)) {
      if (!isMemoCore(rec)) continue
      // origin/tags は欠損・混在に強くする（不正要素だけ除外）。schemaVersion は欠損時に既定へ。
      out.push({
        id: rec.id as string,
        text: rec.text as string,
        date: rec.date as string,
        createdAt: rec.createdAt as string,
        updatedAt: rec.updatedAt as string,
        source: rec.source as MemoSource,
        origin: Array.isArray(rec.origin) ? rec.origin.filter(isChatMsg) : [],
        tags: Array.isArray(rec.tags) ? rec.tags.filter(isString) : [],
        schemaVersion:
          typeof rec.schemaVersion === 'number' ? rec.schemaVersion : FRAGMENT_SCHEMA_VERSION,
      })
    }
    return out
  }
  setMemos(memos: Memo[]): boolean {
    return writeStorage(() =>
      localStorage.setItem(
        KEYS.fragments,
        JSON.stringify({ schemaVersion: FRAGMENT_SCHEMA_VERSION, records: memos }),
      ),
    )
  }

  resetRecordData(): boolean {
    // 失敗時に戻せるよう、削除前に現値をスナップショット。
    const snapshot = new Map<string, string | null>()
    for (const key of RECORD_KEYS) snapshot.set(key, readString(key))
    try {
      for (const key of RECORD_KEYS) localStorage.removeItem(key)
      return true
    } catch {
      // 途中失敗：可能な範囲で保存前の状態へロールバック（成功扱いにしない）。
      writeStorage(() => {
        for (const [key, previous] of snapshot) {
          if (previous === null) localStorage.removeItem(key)
          else localStorage.setItem(key, previous)
        }
      })
      return false
    }
  }
}

export const repo: Repository = new LocalStorageRepository()

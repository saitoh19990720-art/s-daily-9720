// 永続化はこの Repository 層に閉じ込める。将来 Supabase 等へ差し替え可能にするため、
// 画面/状態コードは localStorage を直接触らない（しずくの実装方針）。
// localStorage キーは Vanilla版(oshi-os-demo)と完全に同一 → 既存ユーザーのデータを引き継ぐ。
import type { HealthLog, Oshi, PlanCat, PlanItem, PlanTier, ThemePreference } from './types'

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
} as const

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

// 移行段階で永続化するのは Vanilla版が保存していたキーのみ（挙動を保持）。
// todo / memo は Vanilla版でも未永続化 = セッション内保持。会話のかけら基盤フェーズで永続化する。
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
}

export const repo: Repository = new LocalStorageRepository()

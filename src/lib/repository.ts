// 永続化はこの Repository 層に閉じ込める。将来 Supabase 等へ差し替え可能にするため、
// 画面/状態コードは localStorage を直接触らない（しずくの実装方針）。
// localStorage キーは Vanilla版(oshi-os-demo)と完全に同一 → 既存ユーザーのデータを引き継ぐ。

import type { HealthLog, Oshi, PlanItem, PlanTier, Theme } from './types'

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

// 移行段で永続化するのは Vanilla版が保存していたキーのみ（挙動を保持）。
// todo / memo は Vanilla版でも未永続化 = セッション内保持。会話のかけら基盤フェーズで永続化する。
export interface Repository {
  getOwner(): boolean
  setOwner(v: boolean): void

  getTheme(): Theme | null
  setTheme(t: Theme): void

  getOshi(): Oshi | null
  setOshi(o: Oshi): void

  getOnboardingDone(): boolean
  setOnboardingDone(v: boolean): void

  getPlanItems(): PlanItem[] | null
  setPlanItems(items: PlanItem[]): void

  getHealthLogs(): HealthLog[]
  setHealthLogs(logs: HealthLog[]): void

  getPeriodStart(): string | null
  setPeriodStart(s: string | null): void

  getInPeriod(): boolean
  setInPeriod(v: boolean): void

  getPlanTier(): PlanTier
  setPlanTier(t: PlanTier): void
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export class LocalStorageRepository implements Repository {
  getOwner(): boolean {
    return localStorage.getItem(KEYS.owner) === 'true'
  }
  setOwner(v: boolean): void {
    localStorage.setItem(KEYS.owner, v ? 'true' : 'false')
  }

  getTheme(): Theme | null {
    const t = localStorage.getItem(KEYS.theme)
    return t === 'dark' || t === 'light' ? t : null
  }
  setTheme(t: Theme): void {
    localStorage.setItem(KEYS.theme, t)
  }

  getOshi(): Oshi | null {
    return readJSON<Oshi>(KEYS.oshi)
  }
  setOshi(o: Oshi): void {
    localStorage.setItem(KEYS.oshi, JSON.stringify(o))
  }

  getOnboardingDone(): boolean {
    return !!localStorage.getItem(KEYS.obdone)
  }
  setOnboardingDone(v: boolean): void {
    if (v) localStorage.setItem(KEYS.obdone, '1')
    else localStorage.removeItem(KEYS.obdone)
  }

  getPlanItems(): PlanItem[] | null {
    return readJSON<PlanItem[]>(KEYS.planItems)
  }
  setPlanItems(items: PlanItem[]): void {
    localStorage.setItem(KEYS.planItems, JSON.stringify(items))
  }

  getHealthLogs(): HealthLog[] {
    return readJSON<HealthLog[]>(KEYS.hlogs) ?? []
  }
  setHealthLogs(logs: HealthLog[]): void {
    localStorage.setItem(KEYS.hlogs, JSON.stringify(logs))
  }

  getPeriodStart(): string | null {
    return localStorage.getItem(KEYS.pstart)
  }
  setPeriodStart(s: string | null): void {
    if (s) localStorage.setItem(KEYS.pstart, s)
    else localStorage.removeItem(KEYS.pstart)
  }

  getInPeriod(): boolean {
    return localStorage.getItem(KEYS.pin) === 'true'
  }
  setInPeriod(v: boolean): void {
    localStorage.setItem(KEYS.pin, v ? 'true' : 'false')
  }

  getPlanTier(): PlanTier {
    const p = localStorage.getItem(KEYS.plan)
    return p === 'once' || p === 'sub' ? p : 'free'
  }
  setPlanTier(t: PlanTier): void {
    localStorage.setItem(KEYS.plan, t)
  }
}

export const repo: Repository = new LocalStorageRepository()

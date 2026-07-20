// 推し生活OS — ドメイン型。Vanilla版の暗黙のデータ構造を明示化しただけ（挙動は不変）。
// 命名メモ: メモ機能のユーザー向け正式名称は「会話のかけら」だが、
// 内部の型・変数は初回移行では `memo` のまま保持する（しずくの明示決定）。

export type Theme = 'light' | 'dark'
export type ThemePreference = Theme | 'system'

export interface Oshi {
  name: string
  callname: string
  relation: string
  tone: string
  first: string
  second: string
  nowords: string
  core: string
  banned: string
  avatarImg: string | null
}

export type Prio = 'high' | 'mid' | 'low'

export interface Todo {
  id: string
  text: string
  done: boolean
  due: string
  prio: Prio
}

// 会話のかけら（内部名は memo のまま）。移行段では本文+日付のみ（Vanilla版と同一）。
// 元会話・任意タグの保持は次フェーズ（会話のかけら基盤）で拡張する。
export interface Memo {
  text: string
  date: string
}

export type PlanCat = 'task' | 'fun' | 'care' | 'rest'

export interface PlanItem {
  text: string
  time: string
  cat: PlanCat
}

export interface HealthLog {
  date: string
  mood: string
  pain: string
  tags: string
  memo: string
  period: boolean
}

export type PlanTier = 'free' | 'once' | 'sub'

export type ChatRole = 'user' | 'oshi'

export interface ChatMsg {
  role: ChatRole
  content: string
}

// チャットから抽出される保存候補（保存前の状態＝「保存候補」）。
export type ExtractType = 'todo' | 'memo' | 'plan'

export interface Extract {
  type: ExtractType
  text: string
}

export type OrganizeTab = 'tasks' | 'fragments' | 'schedule'

export type Screen = 'home' | 'chat' | 'organize' | 'health' | 'plan' | 'settings'

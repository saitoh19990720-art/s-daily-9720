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
  // ③-B-1で追加。既存レコード（未保持）でも壊れないよう任意扱い＝後方互換。
  createdAt?: string
  updatedAt?: string
}

// 会話のかけらの保存元。chat=会話から保存 / manual=手入力。
export type MemoSource = 'chat' | 'manual'

// 会話のかけら（内部名は memo のまま＝しずくの明示決定）。
// ③-B-1でバージョン付き構造へ拡張。`date` は表示用の短い日付で、既存UI（Memo画面）の後方互換のため残す。
// `origin` は元会話の最小スナップショット（候補生成に関わるユーザー発言とAI応答のみ。履歴全件は複製しない）。
export interface Memo {
  id: string
  text: string
  date: string
  createdAt: string
  updatedAt: string
  source: MemoSource
  origin: ChatMsg[]
  tags: string[]
  schemaVersion: number
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

// 夜タスクのアラーム。Figma正本 node 152:80（AlarmCard）に対応。
// v0.1は「1件だけ・scheduled表示・ON/OFF」のみ。ringing / snoozed の状態遷移は持たない
// （Figma上の設計としては確定済みだが、実装はv0.2以降）。
export interface Alarm {
  time: string
  enabled: boolean
  label: string
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

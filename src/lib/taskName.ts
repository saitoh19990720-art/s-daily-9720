// かけら本文から既存タスク名UIに収まる妥当なタスク名を「決定的」に生成する（③-B-3-1）。
// AI要約・分類・タイトル生成は使わない。改行/連続空白を1スペースへ畳み、前後空白を除去し、上限で切るだけ。
//
// 上限60文字の理由：既存Task.textには文字数上限が無いが、タスク一覧は1行表示で、
// かけら本文は複数行・長文になりうる。変換入力にだけ60字上限を設けることで一覧の可読性を保つ。
// Task型・既存タスク作成UI・保存形式は一切変更しない（この上限は変換Modalの入力のみに適用）。
export const TASK_NAME_MAX = 60

export function deriveTaskName(fragmentText: string): string {
  return fragmentText.replace(/\s+/g, ' ').trim().slice(0, TASK_NAME_MAX)
}

import type { Candidate } from "../types";
import { detectTodo } from "./oshi";

// チャット入力からローカルで候補を1つ拾う（仕様§12）。優先：予定→TODO→体調→メモ。
const SCHEDULE_HINTS = ["予定", "行く", "会う", "予約", "集合", "出かけ", "ライブ", "イベント", "打ち合わせ"];
const TIME_RE = /(\d{1,2})\s*時|(\d{1,2}):(\d{2})/;

const HEALTH_MAP: [string, string][] = [
  ["眠", "眠気"],
  ["だる", "だるさ"],
  ["頭痛", "頭痛"],
  ["腹痛", "腹痛"],
  ["お腹", "腹痛"],
  ["むくみ", "むくみ"],
  ["イライラ", "イライラ"],
  ["肌荒れ", "肌荒れ"],
  ["生理", "生理"],
];

const MEMO_HINTS = ["覚えておいて", "覚えて", "メモ", "忘れないように", "気になっ", "ほしい", "欲しい", "買いたい"];

function trimEnd(s: string): string {
  return s.replace(/[。、！!？?…\s]+$/u, "").trim();
}

export function detectCandidate(text: string): Candidate | null {
  const t = text.trim();
  if (t.length < 2) return null;

  // 予定（時刻あり or 予定ワード）
  if (TIME_RE.test(t) || SCHEDULE_HINTS.some((h) => t.includes(h))) {
    return { kind: "schedule", text: trimEnd(t) || t };
  }
  // TODO
  const todo = detectTodo(t);
  if (todo) return { kind: "todo", text: todo };
  // 体調（症状タグに変換）
  for (const [k, sym] of HEALTH_MAP) if (t.includes(k)) return { kind: "health", text: sym };
  // メモ
  if (MEMO_HINTS.some((h) => t.includes(h))) {
    const cleaned = trimEnd(t.replace(/(覚えておいて|覚えて|メモして|メモ)/u, ""));
    return { kind: "memo", text: cleaned.length >= 2 ? cleaned : t };
  }
  return null;
}

// 候補の種別ごとの表示メタ
export const CAND_META: Record<Candidate["kind"], { icon: string; label: string; action: string }> = {
  todo: { icon: "📋", label: "TODO候補", action: "TODOに追加" },
  memo: { icon: "🗒", label: "メモ候補", action: "メモに保存" },
  schedule: { icon: "🗓", label: "予定候補", action: "予定に保存" },
  health: { icon: "🩸", label: "体調候補", action: "体調に記録" },
};

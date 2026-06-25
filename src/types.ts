// 推し生活OS のデータ型。全部 localStorage に保存（外部送信なし）。

export type Theme = "light" | "dark";
export type Relationship = "推し" | "相棒" | "恋人未満" | "友達";
// 性格タグ（無料＋お守りプラン）。自由に増やせるよう string。
export type Tone = string;
export type PricingPlanId = "free" | "health" | "omamori";
export type ScreenId = "home" | "chat" | "todo" | "health" | "plan" | "settings" | "memo";

export interface OshiConfig {
  name: string;
  yourName: string;
  avatar: string; // 絵文字 or dataURL
  relationship: Relationship;
  tone: Tone;
  // キャラの“素の設定”（ユーザーがカスタマイズ）
  firstPerson: string; // 一人称（例：わたし／俺／僕）
  catchphrase: string; // 口癖（例：〜だね）
  persona: string; // 性格・キャラ設定（自由記述）
  ngWords: string; // 使わない言葉（NGワード・カンマ区切り）
  gentleOnPeriod: boolean; // 生理中だけ特別やさしくモード
  supportStyles: string[]; // 生活でどう支えてほしい（ほめる/見守る/休ませる 等・複数）
  replyLength: string; // 返答テンポ（短文/普通/長文）
}

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
}

export interface Memo {
  id: string;
  title: string;
  date: string; // MM/DD
}

// 予定（課金プランPricingPlanとは別物・仕様§9）
export type ScheduleCat = "task" | "fun" | "care" | "rest";
export interface ScheduleItem {
  id: string;
  text: string;
  time: string | null; // HH:MM
  cat: ScheduleCat;
  date: string; // YYYY-MM-DD（空可）
}

export interface ChatMsg {
  id: string;
  role: "oshi" | "me";
  text: string;
  ts: number;
  // 推しのメッセージに付くTODO候補（未追加のときだけ表示）
  suggestion?: string;
  suggestionResolved?: boolean;
}

export type Pain = "なし" | "少し" | "つらい";

export interface DailyLog {
  mood: string | null; // 絵文字
  pain: Pain | null;
  symptoms: string[];
}

export interface PeriodLog {
  start: string; // YYYY-MM-DD
  end: string | null; // YYYY-MM-DD（進行中はnull）
}

export interface HealthState {
  cycleStartDate: string | null; // 進行中の生理の開始日キー（無ければnull）
  periods: PeriodLog[]; // 生理の履歴（予測に使う）
  logs: Record<string, DailyLog>; // 日付キー → その日の記録（一日ごと管理）
}

export interface Notifications {
  dailyCheckin: boolean;
  todoReminder: boolean;
  cycleAlert: boolean;
}

export type OmamoriMode = "auto" | "on" | "off";

export interface AppState {
  onboarded: boolean;
  theme: Theme;
  plan: PricingPlanId; // 課金プラン
  omamoriMode: OmamoriMode; // お守りモード（自動＝生理/夜/つらい日に発動）
  oshi: OshiConfig;
  todos: Todo[];
  memos: Memo[];
  schedules: ScheduleItem[];
  chat: ChatMsg[];
  health: HealthState;
  notifications: Notifications;
}

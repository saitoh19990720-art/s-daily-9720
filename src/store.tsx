import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppState, DailyLog, OmamoriMode, Pain, PricingPlanId, Theme, Todo } from "./types";
import { oshiReply } from "./lib/oshi";
import { detectCandidate } from "./lib/extract";
import { todayKey, diffDays, timeOfDay } from "./lib/date";

const KEY = "oshi-life-os:v1";

const initialState: AppState = {
  onboarded: false,
  theme: "light",
  plan: "free",
  omamoriMode: "auto",
  oshi: {
    name: "あかり",
    yourName: "しずく",
    avatar: "🌙",
    relationship: "推し",
    tone: "やさしい",
    mode: "oshi",
    second: "きみ",
    banned: "",
    firstPerson: "わたし",
    catchphrase: "",
    persona: "やさしくて、しずくのことをちゃんと見てる。",
    ngWords: "",
    gentleOnPeriod: true,
    supportStyles: ["見守る"],
    replyLength: "普通",
  },
  todos: [
    { id: "t1", title: "クライアントへの返信", done: false, createdAt: Date.now() },
    { id: "t2", title: "Figmaのワイヤー作業", done: true, createdAt: Date.now() },
  ],
  memos: [{ id: "m1", title: "気になったコスメ情報", date: "05/01" }],
  schedules: [{ id: "s1", text: "明日の予定確認", time: null, cat: "task", date: "" }],
  chat: [],
  health: { cycleStartDate: null, periods: [], logs: {} },
  notifications: { dailyCheckin: true, todoReminder: true, cycleAlert: false },
};

const EMPTY_LOG: DailyLog = { mood: null, pain: null, symptoms: [] };

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState;
    const saved = JSON.parse(raw) as Partial<AppState>;
    // 新しいフィールドが増えても壊れないよう、health/oshi は深くマージ
    return {
      ...initialState,
      ...saved,
      oshi: { ...initialState.oshi, ...(saved.oshi ?? {}) },
      health: { ...initialState.health, ...(saved.health ?? {}) },
    };
  } catch {
    return initialState;
  }
}

// ランダム/時刻に依存させたくない箇所のための簡易連番ID
let _seq = 0;
const uid = () => `${Date.now().toString(36)}-${(_seq++).toString(36)}`;

export interface Store {
  s: AppState;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  finishOnboarding: () => void;
  // TODO
  addTodo: (title: string) => void;
  toggleTodo: (id: string) => void;
  editTodo: (id: string, title: string) => void;
  deleteTodo: (id: string) => void;
  // チャット（芯）
  sendMessage: (text: string) => void;
  acceptCandidate: (msgId: string) => void;
  skipCandidate: (msgId: string) => void;
  // メモ
  addMemo: (text: string) => void;
  deleteMemo: (id: string) => void;
  // 体調
  startPeriod: () => void;
  endPeriod: () => void;
  setMood: (dateKey: string, m: string) => void;
  setPain: (dateKey: string, p: Pain) => void;
  toggleSymptom: (dateKey: string, sym: string) => void;
  // プラン・設定
  setPlan: (p: PricingPlanId) => void;
  setOmamoriMode: (m: OmamoriMode) => void;
  updateOshi: (patch: Partial<AppState["oshi"]>) => void;
  setNotification: (k: keyof AppState["notifications"], v: boolean) => void;
  resetAll: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<AppState>(load);

  // 保存
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* 容量超過などは黙ってスキップ */
    }
  }, [s]);

  // テーマをhtmlへ反映
  useEffect(() => {
    document.documentElement.classList.toggle("dark", s.theme === "dark");
  }, [s.theme]);

  const store = useMemo<Store>(() => {
    const patch = (fn: (d: AppState) => AppState) => setS((d) => fn(d));

    return {
      s,
      setTheme: (t) => patch((d) => ({ ...d, theme: t })),
      toggleTheme: () => patch((d) => ({ ...d, theme: d.theme === "dark" ? "light" : "dark" })),
      finishOnboarding: () => patch((d) => ({ ...d, onboarded: true })),

      addTodo: (title) =>
        patch((d) => {
          const t = title.trim();
          if (!t) return d;
          const todo: Todo = { id: uid(), title: t, done: false, createdAt: Date.now() };
          return { ...d, todos: [todo, ...d.todos] };
        }),
      toggleTodo: (id) =>
        patch((d) => ({
          ...d,
          todos: d.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),
      editTodo: (id, title) =>
        patch((d) => ({
          ...d,
          todos: d.todos.map((t) => (t.id === id ? { ...t, title } : t)),
        })),
      deleteTodo: (id) => patch((d) => ({ ...d, todos: d.todos.filter((t) => t.id !== id) })),

      sendMessage: (text) =>
        patch((d) => {
          const clean = text.trim();
          if (!clean) return d;
          const seed = d.chat.length;
          const reply = oshiReply(clean, d.oshi, seed, isOmamoriActive(d));
          const candidate = detectCandidate(clean) ?? undefined;
          const mine = { id: uid(), role: "me" as const, text: clean, ts: Date.now() };
          const theirs = {
            id: uid(),
            role: "oshi" as const,
            text: reply,
            ts: Date.now(),
            candidate,
            candidateResolved: false,
          };
          return { ...d, chat: [...d.chat, mine, theirs] };
        }),
      acceptCandidate: (msgId) =>
        patch((d) => {
          const msg = d.chat.find((m) => m.id === msgId);
          const c = msg?.candidate;
          if (!c) return d;
          const chat = d.chat.map((m) => (m.id === msgId ? { ...m, candidateResolved: true } : m));
          if (c.kind === "todo") {
            const todo: Todo = { id: uid(), title: c.text, done: false, createdAt: Date.now() };
            return { ...d, todos: [todo, ...d.todos], chat };
          }
          if (c.kind === "memo") {
            const now = new Date();
            const date = `${`${now.getMonth() + 1}`.padStart(2, "0")}/${`${now.getDate()}`.padStart(2, "0")}`;
            return { ...d, memos: [{ id: uid(), title: c.text, date }, ...d.memos], chat };
          }
          if (c.kind === "schedule") {
            return {
              ...d,
              schedules: [
                { id: uid(), text: c.text, time: null, cat: "task" as const, date: "" },
                ...d.schedules,
              ],
              chat,
            };
          }
          // health：今日のログに症状を追加
          const key = todayKey();
          const cur = d.health.logs[key] ?? { mood: null, pain: null, symptoms: [] };
          const symptoms = cur.symptoms.includes(c.text) ? cur.symptoms : [...cur.symptoms, c.text];
          return {
            ...d,
            health: { ...d.health, logs: { ...d.health.logs, [key]: { ...cur, symptoms } } },
            chat,
          };
        }),
      skipCandidate: (msgId) =>
        patch((d) => ({
          ...d,
          chat: d.chat.map((m) => (m.id === msgId ? { ...m, candidateResolved: true } : m)),
        })),

      addMemo: (text) =>
        patch((d) => {
          const t = text.trim();
          if (!t) return d;
          const now = new Date();
          const date = `${`${now.getMonth() + 1}`.padStart(2, "0")}/${`${now.getDate()}`.padStart(2, "0")}`;
          return { ...d, memos: [{ id: uid(), title: t, date }, ...d.memos] };
        }),
      deleteMemo: (id) => patch((d) => ({ ...d, memos: d.memos.filter((m) => m.id !== id) })),

      startPeriod: () =>
        patch((d) => {
          const today = todayKey();
          if (d.health.cycleStartDate) return d; // 既に進行中
          return {
            ...d,
            health: {
              ...d.health,
              cycleStartDate: today,
              periods: [...d.health.periods, { start: today, end: null }],
            },
          };
        }),
      endPeriod: () =>
        patch((d) => {
          const today = todayKey();
          // 直近の未終了の生理を閉じる
          const periods = [...d.health.periods];
          for (let i = periods.length - 1; i >= 0; i--) {
            if (!periods[i].end) {
              periods[i] = { ...periods[i], end: today };
              break;
            }
          }
          return { ...d, health: { ...d.health, cycleStartDate: null, periods } };
        }),
      setMood: (dateKey, m) =>
        patch((d) => {
          const cur = d.health.logs[dateKey] ?? EMPTY_LOG;
          return { ...d, health: { ...d.health, logs: { ...d.health.logs, [dateKey]: { ...cur, mood: m } } } };
        }),
      setPain: (dateKey, p) =>
        patch((d) => {
          const cur = d.health.logs[dateKey] ?? EMPTY_LOG;
          return { ...d, health: { ...d.health, logs: { ...d.health.logs, [dateKey]: { ...cur, pain: p } } } };
        }),
      toggleSymptom: (dateKey, sym) =>
        patch((d) => {
          const cur = d.health.logs[dateKey] ?? EMPTY_LOG;
          const has = cur.symptoms.includes(sym);
          const symptoms = has ? cur.symptoms.filter((x) => x !== sym) : [...cur.symptoms, sym];
          return { ...d, health: { ...d.health, logs: { ...d.health.logs, [dateKey]: { ...cur, symptoms } } } };
        }),

      setPlan: (p) => patch((d) => ({ ...d, plan: p })),
      setOmamoriMode: (m) => patch((d) => ({ ...d, omamoriMode: m })),
      updateOshi: (p) => patch((d) => ({ ...d, oshi: { ...d.oshi, ...p } })),
      setNotification: (k, v) =>
        patch((d) => ({ ...d, notifications: { ...d.notifications, [k]: v } })),
      resetAll: () => setS({ ...initialState, onboarded: true }),
    };
  }, [s]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used within StoreProvider");
  return v;
}

// 生理周期の日数（開始日からの経過日 +1）
export function cycleDay(cycleStartDate: string | null): number | null {
  if (!cycleStartDate) return null;
  return Math.max(1, diffDays(todayKey(), cycleStartDate) + 1);
}

// お守りモードが今ONか（手動オン/オフ優先、自動＝生理中 or 夜 or 今日つらい）
export function isOmamoriActive(s: AppState): boolean {
  if (s.omamoriMode === "on") return true;
  if (s.omamoriMode === "off") return false;
  const onPeriod = !!s.health.cycleStartDate && s.oshi.gentleOnPeriod;
  const night = timeOfDay() === "night";
  const rough = s.health.logs[todayKey()]?.pain === "つらい";
  return onPeriod || night || rough;
}

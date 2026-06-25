import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppState, PlanId, Theme, Todo } from "./types";
import { oshiReply } from "./lib/oshi";

const KEY = "oshi-life-os:v1";

const initialState: AppState = {
  onboarded: false,
  theme: "light",
  plan: "free",
  oshi: {
    name: "あかり",
    yourName: "しずく",
    avatar: "🌙",
    relationship: "推し",
    tone: "やさしい",
    firstPerson: "わたし",
    catchphrase: "",
    persona: "やさしくて、しずくのことをちゃんと見てる。",
    ngWords: "",
  },
  todos: [
    { id: "t1", title: "クライアントへの返信", done: false, createdAt: Date.now() },
    { id: "t2", title: "Figmaのワイヤー作業", done: true, createdAt: Date.now() },
  ],
  memos: [{ id: "m1", title: "気になったコスメ情報", date: "05/01" }],
  plans: [{ id: "p1", text: "明日の予定確認", when: "近日中" }],
  chat: [],
  health: { cycleStartDate: null, mood: null, pain: null, symptoms: [] },
  notifications: { dailyCheckin: true, todoReminder: true, cycleAlert: false },
};

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState;
    return { ...initialState, ...(JSON.parse(raw) as Partial<AppState>) };
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
  acceptSuggestion: (msgId: string) => void;
  skipSuggestion: (msgId: string) => void;
  // 体調
  setCycleStart: (iso: string | null) => void;
  setMood: (m: string) => void;
  setPain: (p: AppState["health"]["pain"]) => void;
  toggleSymptom: (sym: string) => void;
  // プラン・設定
  setPlan: (p: PlanId) => void;
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
          const { reply, suggestion } = oshiReply(clean, d.oshi, seed);
          const mine = { id: uid(), role: "me" as const, text: clean, ts: Date.now() };
          const theirs = {
            id: uid(),
            role: "oshi" as const,
            text: reply,
            ts: Date.now(),
            suggestion: suggestion ?? undefined,
            suggestionResolved: false,
          };
          return { ...d, chat: [...d.chat, mine, theirs] };
        }),
      acceptSuggestion: (msgId) =>
        patch((d) => {
          const msg = d.chat.find((m) => m.id === msgId);
          if (!msg?.suggestion) return d;
          const todo: Todo = {
            id: uid(),
            title: msg.suggestion,
            done: false,
            createdAt: Date.now(),
          };
          return {
            ...d,
            todos: [todo, ...d.todos],
            chat: d.chat.map((m) => (m.id === msgId ? { ...m, suggestionResolved: true } : m)),
          };
        }),
      skipSuggestion: (msgId) =>
        patch((d) => ({
          ...d,
          chat: d.chat.map((m) => (m.id === msgId ? { ...m, suggestionResolved: true } : m)),
        })),

      setCycleStart: (iso) => patch((d) => ({ ...d, health: { ...d.health, cycleStartDate: iso } })),
      setMood: (m) => patch((d) => ({ ...d, health: { ...d.health, mood: m } })),
      setPain: (p) => patch((d) => ({ ...d, health: { ...d.health, pain: p } })),
      toggleSymptom: (sym) =>
        patch((d) => {
          const has = d.health.symptoms.includes(sym);
          return {
            ...d,
            health: {
              ...d.health,
              symptoms: has
                ? d.health.symptoms.filter((x) => x !== sym)
                : [...d.health.symptoms, sym],
            },
          };
        }),

      setPlan: (p) => patch((d) => ({ ...d, plan: p })),
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

// 生理周期の日数を計算（開始日からの経過日 +1）
export function cycleDay(cycleStartDate: string | null): number | null {
  if (!cycleStartDate) return null;
  const start = new Date(cycleStartDate);
  const now = new Date();
  const ms = now.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

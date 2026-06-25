import { useMemo, useState } from "react";
import { useStore, isOmamoriActive } from "../store";
import { Screen, TopBar, Card, SectionTitle } from "../components/ui";
import { Avatar } from "../components/Avatar";
import { oshiGreeting } from "../lib/oshi";
import type { ScreenId } from "../types";

const CAT_ICON: Record<string, string> = { task: "📋", fun: "🎉", care: "🏥", rest: "💤" };

function todayLabel(): string {
  const d = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}.${m}.${day} ${days[d.getDay()]}`;
}

export function Home({ go }: { go: (s: ScreenId) => void }) {
  const { s, toggleTodo, addTodo } = useStore();
  const { oshi, todos, memos, schedules } = s;
  const omamori = isOmamoriActive(s);
  const [quick, setQuick] = useState("");
  const addQuick = () => {
    if (!quick.trim()) return;
    addTodo(quick);
    setQuick("");
  };
  const greet = useMemo(
    () => oshiGreeting(oshi, todos.length + memos.length, omamori),
    [oshi, todos.length, memos.length, omamori],
  );
  const doneCount = todos.filter((t) => t.done).length;

  return (
    <Screen>
      <TopBar
        title={`おかえり、${oshi.yourName}。`}
        caption={`${todayLabel()}　今日も一緒にいるよ。`}
      />

      {omamori && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-accent-soft px-4 py-2.5 text-[13px] font-medium text-accent">
          🛡 お守りモード中。今日は無理しないでいいよ。
        </div>
      )}

      {/* 推しカード */}
      <Card className="bg-gradient-to-br from-accent-soft to-card" onClick={() => go("chat")}>
        <div className="flex items-center gap-3">
          <Avatar value={oshi.avatar} size={48} square className="shadow-soft" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-muted">{oshi.name} — 今日のひとこと</p>
            <p className="mt-1 truncate font-mincho text-[15px] font-medium text-ink">「{greet}」</p>
          </div>
        </div>
        <div className="mt-3 text-right text-[13px] font-bold text-accent">{oshi.name}と話す →</div>
      </Card>

      {/* 今日やること */}
      <div className="mt-2">
        <SectionTitle>
          📋 今日やること
          <span className="ml-auto text-[12px] font-bold text-muted">
            {doneCount}/{todos.length}
          </span>
        </SectionTitle>
        <Card className="space-y-1 p-2">
          {todos.length === 0 && (
            <p className="px-2 py-3 text-[13px] text-muted">まだないよ。チャットで話すと増えるかも。</p>
          )}
          {todos.slice(0, 4).map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTodo(t.id)}
              className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left active:bg-surface"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[11px] ${
                  t.done ? "border-accent bg-accent text-white" : "border-line"
                }`}
              >
                {t.done ? "✓" : ""}
              </span>
              <span className={`text-[14px] ${t.done ? "text-muted line-through" : "text-ink"}`}>
                {t.title}
              </span>
            </button>
          ))}

          {/* ホームから直接ついか */}
          <div className="flex items-center gap-2 px-1 pt-1">
            <input
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addQuick()}
              placeholder="やること を追加…"
              className="h-9 flex-1 rounded-full border border-line bg-surface px-3 text-[13px] text-ink outline-none placeholder:text-muted focus:border-accent"
            />
            <button
              onClick={addQuick}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-[18px] text-white active:opacity-80"
            >
              +
            </button>
          </div>
        </Card>
      </div>

      {/* 最近のメモ */}
      <SectionTitle>
        🗒 最近のメモ
        <span className="ml-auto text-[12px] font-bold text-accent">書く・ぜんぶ見る →</span>
      </SectionTitle>
      <Card className="flex items-center justify-between" onClick={() => go("memo")}>
        <div className="min-w-0">
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
            メモ
          </span>
          <p className="mt-1.5 truncate text-[14px] font-medium text-ink">
            {memos[0]?.title ?? "タップしてメモを書く"}
          </p>
        </div>
        <span className="ml-3 shrink-0 text-[12px] text-muted">{memos[0]?.date ?? ""}</span>
      </Card>

      {/* 近日の予定 */}
      <SectionTitle>🗓 近日の予定</SectionTitle>
      <Card className="flex items-center gap-3">
        <span className="text-[16px]">{schedules[0] ? CAT_ICON[schedules[0].cat] : "🗓"}</span>
        <p className="flex-1 text-[14px] font-medium text-ink">
          {schedules[0]?.text ?? "予定はまだないよ"}
        </p>
        <span className="text-[12px] text-muted">{schedules[0]?.time ?? ""}</span>
      </Card>
    </Screen>
  );
}

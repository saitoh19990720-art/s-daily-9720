import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { Avatar } from "../components/Avatar";
import { CAND_META } from "../lib/extract";

export function Chat() {
  const { s, sendMessage, acceptCandidate, skipCandidate } = useStore();
  const { oshi, chat } = s;
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length]);

  const submit = () => {
    if (!text.trim()) return;
    sendMessage(text);
    setText("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 border-b border-line px-5 py-3">
        <Avatar value={oshi.avatar} size={36} />
        <div>
          <p className="text-[15px] font-bold text-ink">{oshi.name}</p>
          <p className="text-[11px] font-bold text-accent">● オンライン</p>
        </div>
      </div>

      {/* メッセージ */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {chat.length === 0 && (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-[18px]">{oshi.avatar}</span>
            <div className="max-w-[78%] rounded-2xl rounded-tl-md bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-ink">
              今日どんな感じ？気になってること、雑に投げていいよ。
            </div>
          </div>
        )}

        {chat.map((m) =>
          m.role === "me" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[78%] rounded-2xl rounded-tr-md bg-accent px-3.5 py-2.5 text-[14px] leading-relaxed text-white">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <Avatar value={oshi.avatar} size={26} className="mt-0.5" />
                <div className="max-w-[78%] rounded-2xl rounded-tl-md bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-ink">
                  {m.text}
                </div>
              </div>

              {/* 候補カード（芯の機能：TODO/メモ/予定/体調） */}
              {m.candidate && !m.candidateResolved && (
                <div className="ml-7 max-w-[88%] rounded-2xl border border-accent/40 bg-card p-3 shadow-soft">
                  <p className="text-[11px] font-bold text-accent">
                    {CAND_META[m.candidate.kind].icon} {CAND_META[m.candidate.kind].label}
                  </p>
                  <p className="mt-1 text-[14px] font-medium text-ink">「{m.candidate.text}」</p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={() => acceptCandidate(m.id)}
                      className="rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-bold text-white active:opacity-80"
                    >
                      {CAND_META[m.candidate.kind].action}
                    </button>
                    <button
                      onClick={() => skipCandidate(m.id)}
                      className="rounded-full border border-line px-3.5 py-1.5 text-[12px] font-bold text-muted active:bg-surface"
                    >
                      スキップ
                    </button>
                  </div>
                </div>
              )}
              {m.candidate && m.candidateResolved && (
                <p className="ml-7 text-[11px] text-muted">✓ 整理済み</p>
              )}
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      {/* 入力 */}
      <div className="flex items-center gap-2 border-t border-line px-4 pb-[calc(env(safe-area-inset-bottom)+72px)] pt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="話しかけてみて…"
          className="h-11 flex-1 rounded-full border border-line bg-surface px-4 text-[14px] text-ink outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          onClick={submit}
          aria-label="送信"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-[18px] text-white active:opacity-80"
        >
          ↑
        </button>
      </div>
    </div>
  );
}

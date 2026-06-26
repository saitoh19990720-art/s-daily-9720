import type { ScreenId } from "../types";

export const TABS: { id: ScreenId; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "ホーム" },
  { id: "chat", icon: "💬", label: "チャット" },
  { id: "todo", icon: "📋", label: "TODO" },
  { id: "memo", icon: "📝", label: "メモ" },
  { id: "health", icon: "🩸", label: "体調" },
  { id: "plan", icon: "🧿", label: "プラン" },
  { id: "settings", icon: "⚙️", label: "設定" },
];

export function BottomNav({
  active,
  onChange,
  className = "",
}: {
  active: ScreenId;
  onChange: (s: ScreenId) => void;
  className?: string;
}) {
  return (
    <nav
      className={`absolute inset-x-0 bottom-0 z-20 flex items-stretch border-t border-line bg-card/95 px-1 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 backdrop-blur ${className}`}
    >
      {TABS.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className="flex flex-1 flex-col items-center gap-0.5"
          >
            <span className={`text-[18px] leading-none transition-transform ${on ? "scale-110" : "opacity-60"}`}>
              {t.icon}
            </span>
            <span className={`text-[10px] font-bold ${on ? "text-accent" : "text-muted"}`}>
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

import type { ScreenId } from "../types";
import { TABS } from "./BottomNav";

// PC幅（md+）でだけ表示する左サイドバー。スマホは下部ナビ（両方同時に出さない）。
export function SideNav({
  active,
  onChange,
}: {
  active: ScreenId;
  onChange: (s: ScreenId) => void;
}) {
  return (
    <nav className="hidden w-[200px] shrink-0 flex-col border-r border-line bg-card/60 px-3 py-5 md:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="text-[20px]">🌙</span>
        <span className="font-mincho text-[15px] font-bold text-ink">推し生活OS</span>
      </div>
      <div className="flex flex-col gap-1">
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                on ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface"
              }`}
            >
              <span className="text-[18px]">{t.icon}</span>
              <span className="text-[14px] font-bold">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

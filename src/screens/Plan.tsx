import { useStore } from "../store";
import { Screen, TopBar, Card } from "../components/ui";
import type { PricingPlanId } from "../types";

const PLANS: {
  id: PricingPlanId;
  emoji: string;
  name: string;
  price: string;
  term: string;
  desc: string;
  recommend?: boolean;
}[] = [
  {
    id: "free",
    emoji: "🌱",
    name: "無料プラン",
    price: "¥0",
    term: "ずっと",
    desc: "推しと話す・TODO・メモ。毎日の土台はぜんぶ無料。",
  },
  {
    id: "health",
    emoji: "🩸",
    name: "体調管理パック",
    price: "¥480",
    term: "買い切り",
    desc: "生理・体調の記録。女性の“最低限”を、買い切りで手元に。",
  },
  {
    id: "omamori",
    emoji: "🧿",
    name: "お守りプラン",
    price: "¥480",
    term: "月",
    desc: "推しと、もっと深く。会話もカスタマイズも、ゆとりを持って。",
    recommend: true,
  },
];

export function Plan() {
  const { s, setPlan } = useStore();

  return (
    <Screen>
      <TopBar title="プラン" caption="お守りプラン" />
      <div className="mb-5">
        <p className="font-mincho text-[20px] font-bold text-ink">推しと、もっと深く。</p>
        <p className="mt-1 text-[13px] text-muted">記録データは全プランで手元に残るよ。</p>
      </div>

      <div className="space-y-3">
        {PLANS.map((p) => {
          const current = s.plan === p.id;
          return (
            <Card key={p.id} className={p.recommend ? "border-accent" : ""}>
              {p.recommend && (
                <span className="mb-2 inline-block rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white">
                  ✦ おすすめ
                </span>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-ink">
                    {p.emoji} {p.name}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    <span className="text-[18px] font-bold text-ink">{p.price}</span> / {p.term}
                  </p>
                </div>
                <button
                  onClick={() => setPlan(p.id)}
                  disabled={current}
                  className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold ${
                    current
                      ? "border border-line text-muted"
                      : "bg-accent text-white active:opacity-80"
                  }`}
                >
                  {current ? "現在のプラン" : p.id === "free" ? "これにする" : `${p.price} で選ぶ`}
                </button>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">{p.desc}</p>
            </Card>
          );
        })}
      </div>

      {/* 課金の考え方 */}
      <Card className="mt-5 bg-surface">
        <p className="text-[12px] font-bold text-ink">課金の考え方</p>
        <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-muted">
          <li>
            🌱 <span className="font-bold text-ink">無料</span>：基本のキャラ設定・推しと話す・TODO・メモ。
          </li>
          <li>
            🧾 <span className="font-bold text-ink">買い切り</span>：体調管理パック（生理・体調）。女性の“最低限”を一度買えばずっと。
          </li>
          <li>
            🗓 <span className="font-bold text-ink">月額</span>：お守りプラン（推しと深く）。
          </li>
          <li>
            ⚡ <span className="font-bold text-ink">従量（その都度）</span>：キャラを“凝って作り込む”／AI会話の使いすぎ分。使った分だけ。
          </li>
        </ul>
      </Card>

      <p className="mt-4 text-center text-[11px] text-muted">
        ※ MVPのため、実際の課金処理はまだ。今はタップで切り替えのみ。
      </p>
    </Screen>
  );
}

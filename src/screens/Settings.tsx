import { useStore } from "../store";
import { Screen, TopBar, Card, Chip, PrimaryButton } from "../components/ui";
import { Avatar, fileToAvatarDataUrl } from "../components/Avatar";
import { buildSystemPrompt } from "../lib/oshi";
import type { Relationship, Tone } from "../types";

const AVATARS = ["🌙", "⭐", "💫", "🐰", "🐱", "🌸", "💙", "🎀", "🦋", "🍓"];
const RELATIONS: Relationship[] = ["推し", "相棒", "恋人未満", "友達"];
const TONES: Tone[] = ["やさしい", "クール", "甘い", "ツンデレ"];

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-2xl border border-line bg-surface px-3.5 text-[14px] text-ink outline-none focus:border-accent"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold text-muted">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full resize-none rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-muted focus:border-accent"
      />
    </label>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-7 w-12 rounded-full transition-colors ${on ? "bg-accent" : "bg-line"}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

export function Settings() {
  const { s, updateOshi, setTheme, setNotification, resetAll } = useStore();
  const { oshi, theme, notifications } = s;

  return (
    <Screen>
      <TopBar title="⚙️ 設定" caption="推しのこと、見た目、通知。" />

      {/* 推し設定：アバター */}
      <Card>
        <p className="text-[13px] font-bold text-ink">アバター画像</p>
        <div className="mt-3 flex items-center gap-4">
          <Avatar value={oshi.avatar} size={68} square className="shadow-soft" />
          <div className="min-w-0 flex-1">
            <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-accent px-4 text-[13px] font-bold text-white active:opacity-80">
              画像を選ぶ
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const url = await fileToAvatarDataUrl(file);
                    updateOshi({ avatar: url });
                  } catch {
                    window.alert("画像を読み込めなかった…別の画像で試してみて。");
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <p className="mt-1.5 text-[11px] leading-snug text-muted">
              チェキ・アイコン・イラスト何でもOK。
              <br />
              この端末の中だけに保存（外に出ないよ）。
            </p>
          </div>
        </div>

        <p className="mb-2 mt-4 text-[12px] font-bold text-muted">絵文字から選ぶ</p>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => updateOshi({ avatar: a })}
              className={`flex h-11 w-11 items-center justify-center rounded-2xl text-[22px] transition-transform ${
                oshi.avatar === a ? "scale-110 bg-accent-soft ring-2 ring-accent" : "bg-surface"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </Card>

      {/* 基本情報 */}
      <Card className="mt-4 space-y-4">
        <p className="text-[13px] font-bold text-ink">基本情報</p>
        <Field label="推しの名前" value={oshi.name} onChange={(v) => updateOshi({ name: v })} />
        <Field label="私への呼び方" value={oshi.yourName} onChange={(v) => updateOshi({ yourName: v })} />
        <div>
          <span className="text-[12px] font-bold text-muted">関係性</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {RELATIONS.map((r) => (
              <Chip key={r} active={oshi.relationship === r} onClick={() => updateOshi({ relationship: r })}>
                {r}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[12px] font-bold text-muted">口調・話し方</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {TONES.map((t) => (
              <Chip key={t} active={oshi.tone === t} onClick={() => updateOshi({ tone: t })}>
                {t}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">※ 口調はチャットの返事に反映されるよ。</p>
        </div>
      </Card>

      {/* キャラの詳しい設定 */}
      <Card className="mt-4 space-y-4">
        <div>
          <p className="text-[13px] font-bold text-ink">キャラの設定</p>
          <p className="mt-0.5 text-[12px] text-muted">推しの“素”を作る。一人称と口癖は返事に反映されるよ。</p>
        </div>
        <Field
          label="一人称"
          value={oshi.firstPerson}
          onChange={(v) => updateOshi({ firstPerson: v })}
        />
        <Field
          label="口癖（あれば）"
          value={oshi.catchphrase}
          onChange={(v) => updateOshi({ catchphrase: v })}
        />
        <Textarea
          label="性格・キャラ設定"
          value={oshi.persona}
          placeholder="例：クールに見えて、しずくにだけ甘い。心配性。"
          onChange={(v) => updateOshi({ persona: v })}
        />
        <Field
          label="使わない言葉（NGワード・読点区切り）"
          value={oshi.ngWords}
          onChange={(v) => updateOshi({ ngWords: v })}
        />
        <p className="text-[11px] leading-snug text-muted">
          ※ 性格・NGは保存される。AI会話につないだ時にフルに効く（今はルールベースなので一人称・口癖・NG除去まで反映）。
        </p>
      </Card>

      {/* テーマ */}
      <Card className="mt-4">
        <p className="mb-3 text-[13px] font-bold text-ink">テーマカラー</p>
        <div className="flex gap-2">
          <Chip active={theme === "light"} onClick={() => setTheme("light")}>
            ☀️ ライト
          </Chip>
          <Chip active={theme === "dark"} onClick={() => setTheme("dark")}>
            🌙 ダーク
          </Chip>
        </div>
      </Card>

      {/* 通知 */}
      <Card className="mt-4 space-y-3">
        <p className="text-[13px] font-bold text-ink">通知</p>
        {([
          ["dailyCheckin", "毎日の声かけ"],
          ["todoReminder", "TODOのリマインド"],
          ["cycleAlert", "生理周期のお知らせ"],
        ] as const).map(([k, label]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-[14px] text-ink">{label}</span>
            <Toggle on={notifications[k]} onClick={() => setNotification(k, !notifications[k])} />
          </div>
        ))}
        <p className="text-[11px] text-muted">※ MVPでは設定の保存のみ（実際の通知送信はまだ）。</p>
      </Card>

      {/* AI会話（あとから接続） */}
      <Card className="mt-4">
        <p className="text-[13px] font-bold text-ink">AIと自由に会話（準備）</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          設定したキャラから「AI用のプロンプト」を自動で作ってあるよ。アプリ内のAI接続は近日。
          今すぐ自由に話したいときは、これをコピーしてChatGPTやClaudeに貼ればOK。
        </p>
        <PrimaryButton
          className="mt-3 w-full"
          onClick={async () => {
            const prompt = buildSystemPrompt(oshi);
            try {
              await navigator.clipboard.writeText(prompt);
              window.alert("キャラのプロンプトをコピーしたよ。AIに貼って話してみて。");
            } catch {
              window.prompt("コピーできなかったので、ここから手動でコピーしてね", prompt);
            }
          }}
        >
          キャラのプロンプトをコピー
        </PrimaryButton>
      </Card>

      {/* アカウント */}
      <Card className="mt-4">
        <p className="mb-2 text-[13px] font-bold text-ink">アカウント</p>
        <p className="mb-3 text-[12px] text-muted">
          データはこの端末の中だけに保存されています（外部送信なし）。
        </p>
        <PrimaryButton
          className="w-full !bg-surface !text-muted"
          onClick={() => {
            if (window.confirm("すべての記録を消して最初からにする？")) resetAll();
          }}
        >
          すべてリセット
        </PrimaryButton>
      </Card>
    </Screen>
  );
}

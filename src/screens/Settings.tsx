import { useStore } from "../store";
import { Screen, TopBar, Card, Chip, PrimaryButton } from "../components/ui";
import { Avatar, fileToAvatarDataUrl } from "../components/Avatar";
import { buildSystemPrompt } from "../lib/oshi";
import type { Relationship, OshiMode } from "../types";

const AVATARS = ["🌙", "⭐", "💫", "🐰", "🐱", "🌸", "💙", "🎀", "🦋", "🍓"];
const RELATIONS: Relationship[] = ["推し", "相棒", "恋人未満", "友達"];
const FREE_TONES = ["やさしい", "クール", "甘い", "ツンデレ", "明るい", "敬語"];
const PAID_TONES = [
  "甘やかし",
  "過保護",
  "一途",
  "独占欲強め",
  "嫉妬深め",
  "面倒見がいい",
  "心配性",
  "無口",
  "厳しめ",
  "穏やか",
];
const SUPPORT_STYLES = ["ほめる", "見守る", "急かす", "休ませる", "一緒に整理", "短く言う"];
const MODES: { v: OshiMode; label: string; hint: string }[] = [
  { v: "secretary", label: "秘書", hint: "丁寧・効率" },
  { v: "friend", label: "友達", hint: "対等・フランク" },
  { v: "oshi", label: "推し", hint: "親密・特別" },
];

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
        <div>
          <span className="text-[12px] font-bold text-muted">モード</span>
          <div className="mt-1.5 flex gap-2">
            {MODES.map((m) => (
              <Chip key={m.v} active={oshi.mode === m.v} onClick={() => updateOshi({ mode: m.v })}>
                {m.label}
              </Chip>
            ))}
          </div>
        </div>
        <Field label="推しの名前" value={oshi.name} onChange={(v) => updateOshi({ name: v })} />
        <Field label="私への呼び方" value={oshi.yourName} onChange={(v) => updateOshi({ yourName: v })} />
        <Field label="二人称（推し→あなた）" value={oshi.second} onChange={(v) => updateOshi({ second: v })} />
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
          <span className="text-[12px] font-bold text-muted">性格・口調</span>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted">無料</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {FREE_TONES.map((t) => (
              <Chip key={t} active={oshi.tone === t} onClick={() => updateOshi({ tone: t })}>
                {t}
              </Chip>
            ))}
          </div>
          <p className="mt-3 text-[10px] font-bold text-accent">🧿 お守りプラン（課金で解放・作者は無料）</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {PAID_TONES.map((t) => (
              <Chip key={t} active={oshi.tone === t} onClick={() => updateOshi({ tone: t })}>
                {t}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted">
            ※ 性格はチャットの返事に反映。人気タグは専用セリフ、他はやさしめ＋AI接続で全タグフル反映。
          </p>
        </div>

        <div>
          <span className="text-[12px] font-bold text-muted">生活でどう支えてほしい？（複数OK）</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {SUPPORT_STYLES.map((st) => {
              const on = oshi.supportStyles.includes(st);
              return (
                <Chip
                  key={st}
                  active={on}
                  onClick={() =>
                    updateOshi({
                      supportStyles: on
                        ? oshi.supportStyles.filter((x) => x !== st)
                        : [...oshi.supportStyles, st],
                    })
                  }
                >
                  {st}
                </Chip>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted">
            ※ 推しの「生活の支え方」。これがこのアプリの核（性格で管理のされ方が変わる）。AI接続でフルに効く。
          </p>
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
        <Field
          label="禁止事項（絶対にしないこと）"
          value={oshi.banned}
          onChange={(v) => updateOshi({ banned: v })}
        />
        <p className="text-[11px] leading-snug text-muted">
          ※ 性格・NGは保存される。AI会話につないだ時にフルに効く（今はルールベースなので一人称・口癖・NG除去まで反映）。
        </p>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-ink">🩸 生理中だけ、やさしくモード</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">
              体調で「生理開始」を記録した日は、設定した口調に関係なく特別やさしくなるよ。
            </p>
          </div>
          <Toggle
            on={oshi.gentleOnPeriod}
            onClick={() => updateOshi({ gentleOnPeriod: !oshi.gentleOnPeriod })}
          />
        </div>
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

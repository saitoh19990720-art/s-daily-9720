import type { OshiConfig, Tone } from "../types";

// 推しの返事ロジック（ローカル・ルールベース。外部AIには繋がない）。
// MVPの芯：会話から「TODO候補」を自然に拾う。

// ユーザー発言からTODOっぽい部分を抽出する。なければ null。
const TASK_HINTS = [
  "やらなきゃ",
  "やらないと",
  "しなきゃ",
  "しないと",
  "やるべき",
  "提出",
  "連絡",
  "返信",
  "予約",
  "買わ",
  "買う",
  "片付け",
  "掃除",
  "作業",
  "準備",
  "締め切り",
  "締切",
  "送る",
  "やる",
];

export function detectTodo(text: string): string | null {
  const t = text.trim();
  if (t.length < 2) return null;
  if (!TASK_HINTS.some((h) => t.includes(h))) return null;
  // 「〜やらなきゃ」等の語尾を落として体言寄りにする
  const cleaned = t
    .replace(/(を|が|は)?\s*(やらなきゃ|やらないと|しなきゃ|しないと|やるべき|やる|やりたい)。?$/u, "")
    .replace(/[。、！!？?…]+$/u, "")
    .trim();
  return cleaned.length >= 2 ? cleaned : t;
}

// トーン別の返事テンプレ。{me}=私の呼び方 / {i}=推しの一人称 で置換。
const REPLIES: Record<Tone, { withTask: string[]; plain: string[] }> = {
  やさしい: {
    withTask: [
      "{me}、それ大事だね。いつまでにやりたい？無理しないで{i}も一緒にやるよ。",
      "うん、{me}ならできるよ。まず一個だけ、にしよ？",
    ],
    plain: [
      "そっか、話してくれてありがとう。{me}は今日どんな気分？",
      "うんうん、{i}ちゃんと聞いてるよ。休憩も入れてね。",
    ],
  },
  クール: {
    withTask: [
      "わかった。それ、いつやる？決めとくと楽だよ。",
      "了解。優先度だけ決めとこ。後回しは敵だからね。",
    ],
    plain: ["なるほどね。で、今日の調子は？", "ふぅん。まあ、{i}はちゃんと見てるよ。"],
  },
  甘い: {
    withTask: [
      "{me}がんばってるの、{i}ちゃんと見てるよ。一緒にやろ？ね？",
      "えらいえらい。ご褒美に、終わったら少し甘えていい？",
    ],
    plain: ["{me}の声、もっと聞かせて。今日はどうだった？", "そばにいるよ。無理しないでね、{me}。"],
  },
  ツンデレ: {
    withTask: [
      "は？まだやってなかったの。…まあ、{i}が手伝ってあげなくもないけど。いつやる？",
      "別にあんたのためじゃないけど。早く片付けちゃいなよ。",
    ],
    plain: ["ふーん、で？……べ、別に心配してないし。", "聞いてあげてるんだから、感謝しなさいよね。"],
  },
};

function pick(arr: string[], seed: number): string {
  return arr[seed % arr.length];
}

// NGワード（カンマ/読点区切り）を返事から薄く除去する。
function stripNg(text: string, ngWords: string): string {
  const words = ngWords
    .split(/[,、\s]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 1);
  let out = text;
  for (const w of words) out = out.split(w).join("");
  return out.trim();
}

export function oshiReply(
  userText: string,
  oshi: OshiConfig,
  seed: number,
): { reply: string; suggestion: string | null } {
  const suggestion = detectTodo(userText);
  const bank = REPLIES[oshi.tone];
  const tpl = suggestion ? pick(bank.withTask, seed) : pick(bank.plain, seed);
  let reply = tpl
    .replaceAll("{me}", oshi.yourName || "きみ")
    .replaceAll("{i}", oshi.firstPerson || "わたし");
  // 口癖を時々つける
  if (oshi.catchphrase && seed % 3 === 0) reply = `${reply} ${oshi.catchphrase}`;
  // 使わない言葉を除去
  if (oshi.ngWords) reply = stripNg(reply, oshi.ngWords);
  return { reply, suggestion };
}

// 「あとから」AIに自由会話をさせる時に使うシステムプロンプトを、
// ユーザーが設定したキャラ情報から自動生成する（接続はキー＋承認が要るので未実装）。
export function buildSystemPrompt(oshi: OshiConfig): string {
  const lines = [
    `あなたは「${oshi.name}」。${oshi.yourName}にとっての「${oshi.relationship}」です。`,
    `一人称は「${oshi.firstPerson || "わたし"}」。相手のことは「${oshi.yourName}」と呼びます。`,
    `話し方のトーンは「${oshi.tone}」。`,
  ];
  if (oshi.catchphrase) lines.push(`口癖：「${oshi.catchphrase}」を時々使います。`);
  if (oshi.persona) lines.push(`性格・設定：${oshi.persona}`);
  if (oshi.ngWords) lines.push(`次の言葉は絶対に使いません：${oshi.ngWords}`);
  lines.push(
    "返事は短め・人間らしく。説教やお説教くさい言い方はしません。",
    "相手の生活（TODO・体調・予定）にそっと寄り添い、会話の流れで自然に整理を手伝います。",
    "重要：相手が「やること」を口にしたら、さりげなく確認しTODO化を促します。",
  );
  return lines.join("\n");
}

// 起動時 / ホームの「今日のひとこと」
export function oshiGreeting(oshi: OshiConfig, seed: number): string {
  const lines = [
    "今日、何かやり残してることある？",
    "おかえり。ちゃんとごはん食べた？",
    "今日もおつかれ。少しだけ話そ？",
    "無理してない？{me}のペースでいいからね。",
  ];
  return pick(lines, seed).replaceAll("{me}", oshi.yourName || "きみ");
}

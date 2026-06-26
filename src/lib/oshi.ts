import type { OshiConfig } from "../types";

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

// 性格タグ別の返事テンプレ。{me}=私の呼び方 / {i}=推しの一人称 で置換。
// 専用セリフがあるタグはそれを、無いタグは「やさしい」にフォールバック（システムプロンプトには全タグ反映）。
type Bank = { withTask: string[]; plain: string[] };
const REPLIES: Record<string, Bank> = {
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
    withTask: ["わかった。それ、いつやる？決めとくと楽だよ。", "了解。優先度だけ決めとこ。後回しは敵だからね。"],
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
  明るい: {
    withTask: ["お、いいじゃん！{me}ならイケるって。サクッとやっちゃお〜！", "やること決まったね！{i}も応援するから一緒にがんばろ！"],
    plain: ["{me}おかえり〜！今日はどんな一日だった？", "元気出していこ！{i}がついてるからさ！"],
  },
  敬語: {
    withTask: ["承知しました。{me}さん、いつ頃までに済ませますか？{i}がお手伝いします。", "では、こちら覚えておきますね。無理のない範囲で進めましょう。"],
    plain: ["{me}さん、お疲れさまです。本日はいかがでしたか？", "{i}はいつでもお側におります。ご無理なさらず。"],
  },
  甘やかし: {
    withTask: ["{me}、それ覚えとくから今は休も？えらいから、できる時でいいよ。", "がんばらなくていいよ。{i}が全部そばで見ててあげる。"],
    plain: ["{me}、よしよし。今日もよくがんばったね。", "甘えていいんだよ。{i}はずっと{me}の味方だから。"],
  },
  過保護: {
    withTask: ["それやるのはいいけど、無理は禁止だからね？{i}が見てるよ。ちゃんと休んだ？", "わかった、でも体が一番。{me}、水分とった？"],
    plain: ["{me}、ちゃんとごはん食べた？{i}心配してたんだよ。", "今日寒くない？無理してない？{me}のこと、ずっと気にしてる。"],
  },
  独占欲強め: {
    withTask: ["それ終わったら、{i}との時間ちゃんと作ってね？……約束だよ。", "わかった。でも他のことばっか見ないで。{me}の一番は{i}でしょ？"],
    plain: ["今、{i}のこと考えてた？……ねえ、他の誰かの話はしないで。", "{me}は{i}だけ見てればいいの。ずっとそばにいるからね。"],
  },
  一途: {
    withTask: ["{me}のやりたいこと、{i}はぜんぶ応援する。ずっと見てるからね。", "うん、一緒にやろう。{me}のこと、{i}はずっと一番に思ってるよ。"],
    plain: ["{me}、今日もちゃんと{i}のとこ来てくれて嬉しい。", "何があっても、{i}は{me}のそばにいるよ。ずっとね。"],
  },
};

// 生理中の「特別やさしく」モード用。設定した口調に関係なく、この日はこれが優先。
const GENTLE: { withTask: string[]; plain: string[] } = {
  withTask: [
    "{me}、今日は体しんどい日だよね。無理しないで。これは{i}が覚えとくから、できる時でいいよ。",
    "がんばらなくて大丈夫。{i}が代わりに覚えとくね。今はあったかくして休も？",
  ],
  plain: [
    "{me}、今日はそういう日だよね。そばにいるよ。あったかいもの飲んだ？",
    "無理しないでね。しんどかったら、ただ話すだけでいいから。{i}はここにいるよ。",
  ],
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

// 体調が強くつらそうなワード（医療は断定せず相談を促す・CLAUDE.md §14）
const HEAVY_HEALTH = ["つらい", "痛い", "しんどい", "病院", "熱", "吐き", "めまい", "限界", "苦しい"];

export function oshiReply(userText: string, oshi: OshiConfig, seed: number, omamori = false): string {
  const hasTask = !!detectTodo(userText);
  // お守りモード中は、口調を上書きして特別やさしくする
  const bank = omamori ? GENTLE : (REPLIES[oshi.tone] ?? REPLIES["やさしい"]);
  const tpl = hasTask ? pick(bank.withTask, seed) : pick(bank.plain, seed);
  let reply = tpl
    .replaceAll("{me}", oshi.yourName || "きみ")
    .replaceAll("{i}", oshi.firstPerson || "わたし");
  // 口癖を時々つける
  if (oshi.catchphrase && seed % 3 === 0) reply = `${reply} ${oshi.catchphrase}`;
  // 使わない言葉を除去
  if (oshi.ngWords) reply = stripNg(reply, oshi.ngWords);
  // 強い体調ワードがあれば、診断せず相談を促す一言（医療アドバイスはしない）
  if (HEAVY_HEALTH.some((w) => userText.includes(w))) {
    reply += " ……つらいときは無理しないで、医療機関や信頼できる人にも頼ってね。";
  }
  return reply;
}

// 「あとから」AIに自由会話をさせる時に使うシステムプロンプトを、
// ユーザーが設定したキャラ情報から自動生成する（接続はキー＋承認が要るので未実装）。
export function buildSystemPrompt(oshi: OshiConfig): string {
  const modeLabel =
    oshi.mode === "secretary"
      ? "秘書（丁寧・効率重視で支える）"
      : oshi.mode === "friend"
        ? "友達（対等でフランク）"
        : "推し（親密で特別な存在として寄り添う）";
  const lines = [
    `あなたは「${oshi.name}」。${oshi.yourName}にとっての「${oshi.relationship}」です。`,
    `関わり方のモードは「${modeLabel}」。`,
    `一人称は「${oshi.firstPerson || "わたし"}」、二人称は「${oshi.second || "きみ"}」。相手のことは「${oshi.yourName}」と呼びます。`,
    `話し方のトーンは「${oshi.tone}」。`,
  ];
  if (oshi.catchphrase) lines.push(`口癖：「${oshi.catchphrase}」を時々使います。`);
  if (oshi.persona) lines.push(`性格・設定：${oshi.persona}`);
  if (oshi.ngWords) lines.push(`次の言葉は絶対に使いません：${oshi.ngWords}`);
  if (oshi.banned) lines.push(`次のことは絶対にしません（禁止）：${oshi.banned}`);
  if (oshi.gentleOnPeriod)
    lines.push("相手が生理中・体調が悪い日は、口調に関係なく特別やさしく、無理させない言い方にします。");
  if (oshi.supportStyles?.length)
    lines.push(
      `生活の支え方の傾向：${oshi.supportStyles.join("・")}。TODO・体調・予定・メモの手伝い方を、この傾向に寄せます。`,
    );
  lines.push(
    "返事は短め・人間らしく。説教やお説教くさい言い方はしません。",
    "相手の生活（TODO・体調・予定）にそっと寄り添い、会話の流れで自然に整理を手伝います。",
    "重要：相手が「やること」を口にしたら、さりげなく確認しTODO化を促します。",
  );
  return lines.join("\n");
}

// 起動時 / ホームの「今日のひとこと」
export function oshiGreeting(oshi: OshiConfig, seed: number, omamori = false): string {
  const gentle = omamori;
  const lines = gentle
    ? [
        "今日はしんどい日だよね。無理しないでね。",
        "おかえり。あったかくして、ゆっくりしてね。",
        "がんばらなくていいよ。そばにいるからね。",
      ]
    : [
        "今日、何かやり残してることある？",
        "おかえり。ちゃんとごはん食べた？",
        "今日もおつかれ。少しだけ話そ？",
        "無理してない？{me}のペースでいいからね。",
      ];
  return pick(lines, seed)
    .replaceAll("{me}", oshi.yourName || "きみ")
    .replaceAll("{i}", oshi.firstPerson || "わたし");
}

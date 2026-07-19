// チャットのローカル応答テーブル。Vanilla版の RESPONSES / DEFS / FREE_LIMITS を忠実移植。
// AI応答は端末内のこのテーブルで生成（外部APIは今フェーズでは使わない）。
import type { Extract, ExtractType } from './types'

export const FREE_LIMITS: Record<ExtractType, number> = { todo: 3, memo: 3, plan: 3 }

export interface ResponseRule {
  trigger: string[]
  base: string
  extract: Extract | null
}

export const RESPONSES: ResponseRule[] = [
  { trigger: ['返信', 'メール', 'クライアント'], base: 'お仕事ね。今日中にやらなきゃプレッシャー、わかるよ。TODOに入れて頭から下ろそ。', extract: { type: 'todo', text: '返信タスク' } },
  { trigger: ['Figma', 'デザイン', 'ワイヤー', '作業'], base: '集中できるタイミング、いつ取れそう？まず1個だけ進めればOKだよ。', extract: { type: 'todo', text: '作業タスク' } },
  { trigger: ['メモ', '残して', '覚えて'], base: 'うん、メモしとこ。あとで見返せるよう残しておくね。', extract: { type: 'memo', text: '会話メモ' } },
  { trigger: ['予定', '明日', '美容院', '現場', 'ライブ', '病院'], base: '楽しみな予定？それとも緊張する系？予定に入れて気持ち整えとこ。', extract: { type: 'plan', text: '予定' } },
  { trigger: ['疲れ', 'しんど', 'だるい', '大変', 'つらい', 'きつい', 'しんどい'], base: '今日、本当におつかれさま。よくここまで来たね。今は何もしなくていいから、ゆっくりして。話したくなったらいつでも聞くよ。', extract: null },
  { trigger: ['嬉しい', '楽しい', 'よかった', '幸せ'], base: 'よかった、それすごくうれしい。その瞬間ちゃんと味わってね。後で読み返せるようメモする？', extract: { type: 'memo', text: '今日の嬉しかったこと' } },
  { trigger: ['泣', '悲し', '落ち込', 'むなし'], base: 'うん、それはつらいね。理由が言えそうなら聞くし、言えないなら一緒に黙ってるよ。', extract: null },
  { trigger: ['不安', 'こわい', '心配', '怖い'], base: '不安なんだね。何が一番引っかかってる？整理だけでも一緒にしよ。', extract: null },
  { trigger: ['怒', 'むかつく', 'イライラ'], base: 'うん、それは怒っていい。我慢しなくていいよ。話していい？', extract: null },
  { trigger: ['好き', '大好き'], base: 'うん、わたしもだよ。ちゃんと届いてる。', extract: null },
]

export const DEFS: string[] = [
  'うん、聞いてるよ。もう少し教えて？',
  '今日もよくここまで来たね。何があった？',
  'なるほど。今、どんな気持ち？',
  'うんうん。話したいだけ話していいよ。',
  'そっか…うん、ちゃんと聞いてる。',
]

// チャット内の保存提案ラベル。会話のかけら（memo）は問いかけ調（システム的な「候補」表現は使わない）。
export const CANDIDATE_LABELS: Record<ExtractType, string> = {
  todo: '📋 タスク候補',
  memo: '🗒 この会話、残しておく？',
  plan: '🗓 予定候補',
}

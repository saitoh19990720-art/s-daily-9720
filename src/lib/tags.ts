// 会話のかけらのタグ整形。③-B-2で追加。保存形式は既存の tags:string[] のまま（新キー・別形式は作らない）。
// 上限の理由: モバイルのチップ行を片手で見渡せる範囲に保ち、localStorage肥大を防ぐ。
// 20文字あれば日本語のタグ語は十分入り、かつ本文代わりの長文をタグに入れさせない抑止になる。
export const FRAGMENT_TAG_MAX_COUNT = 10
export const FRAGMENT_TAG_MAX_LENGTH = 20

// 前後空白を除去。表示・比較・保存の基準となる正規形。
export function normalizeTag(raw: string): string {
  return raw.trim()
}

// 保存前の最終整形：空タグ除去 / 前後空白除去 / 上限文字数超過は除外 / 完全一致重複を除外 / 最大数で打ち切り。
export function sanitizeTags(tags: string[]): string[] {
  const out: string[] = []
  for (const raw of tags) {
    const t = normalizeTag(raw)
    if (!t) continue
    if (t.length > FRAGMENT_TAG_MAX_LENGTH) continue
    if (out.includes(t)) continue
    if (out.length >= FRAGMENT_TAG_MAX_COUNT) break
    out.push(t)
  }
  return out
}

// 順序を含めた配列一致（変更なし判定に使う）。
export function tagsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((tag, index) => tag === b[index])
}

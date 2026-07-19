# Codex 監査引き継ぎ｜推し生活OS React移植（9画面・1監査単位）

> 目的：Vanilla HTML版（`../oshi-os-demo/index.html`）から React+TS+Vite へ移植した**9画面**を、1つの監査単位としてCodexに検品してもらう。
> このフェーズは「**忠実移植**」。新機能追加・Figma v2.1準拠化・「会話のかけら」基盤は**未着手**（次フェーズ）。
> 触ってはいけない別プロジェクト：**観測ログ（oshi-memory）／ mibane**。本移植では未接触。

---

## 1. 対象プロジェクトの絶対パス
```
C:\Users\NEC-PCuser\OneDrive\デスクトップ\新しいフォルダー\01_ACTIVE_PROJECTS_作業中\oshi-life-os
（Git Bash: /c/Users/NEC-PCuser/OneDrive/デスクトップ/新しいフォルダー/01_ACTIVE_PROJECTS_作業中/oshi-life-os）
```
リポジトリ正本ルール：ルート `../../CLAUDE.md` / `../../AGENTS.md`。

## 2. git status --short（本プロジェクト）
```
?? 01_ACTIVE_PROJECTS_作業中/oshi-life-os/
```
- プロジェクト全体が**新規・未追跡（untracked）**。commit していない。
- `oshi-os-demo`（Vanilla正本）と `oshi-memory`（観測ログ）は**作業ツリー変更なし＝保全**。
- `mibane` はリポジトリ上元から未追跡（本移植では未接触）。

## 3. git diff --stat
```
（空）
```
- 追跡済みファイルの差分は無い（プロジェクトごと新規のため）。ファイル実体は §4 を参照。

## 4. 変更・新規ファイルの全一覧（32ファイル。うち手作業31＋npm生成1）
設定・ルート（7）
```
.gitignore / index.html / package.json / tsconfig.json / tsconfig.node.json / vite.config.ts / README.md
```
src 直下（3）
```
src/main.tsx / src/App.tsx / src/index.css   ← index.css は Vanilla の <style> を忠実移植
```
src/lib（3）
```
src/lib/types.ts / src/lib/repository.ts / src/lib/constants.ts
```
src/state（1）
```
src/state/AppContext.tsx   ← 498行・状態集約の心臓部（最重点）
```
src/components（8）
```
TabBar.tsx / Toast.tsx / Modal.tsx / TodoItem.tsx / TopBits.tsx / TodoModal.tsx / MemoModal.tsx / PlanModal.tsx
```
src/screens（9）
```
Onboarding.tsx / Home.tsx / Chat.tsx / Todo.tsx / Memo.tsx / PlanList.tsx / Health.tsx / Plan.tsx / Settings.tsx
```
生成物（監査対象外）：`package-lock.json`（npm生成）/ `node_modules/` / `dist/`

## 5. 移植した9画面
| 画面 | ファイル | owner限定 | 概要 |
|---|---|---|---|
| オンボーディング | Onboarding.tsx | – | 3ステップ（※v2.1は4ステップ＝未対応） |
| ホーム | Home.tsx | – | 日付・挨拶・推しひとこと・今日の最重要タスク |
| チャット | Chat.tsx | – | 会話→保存候補提案→**確認後に保存**（自動保存なし） |
| タスク | Todo.tsx (+TodoModal) | – | 追加/編集/削除/完了・優先度・期限 |
| 会話のかけら | Memo.tsx (+MemoModal) | – | 追加/編集/削除（内部型名は `memo`） |
| 予定 | PlanList.tsx (+PlanModal) | ◯ | 一覧・追加・削除・推しの予定コメント |
| 体調・生理 | Health.tsx | ◯ | 生理サイクル・気分/痛み/症状・お守りモード・記録 |
| プラン（課金） | Plan.tsx | ◯ | 無料/¥480買切/¥480月。**実課金なしのモック** |
| 設定 | Settings.tsx | – | 推し人格設定・アバター・特殊モード |

ナビ：ホーム / 話す / タスク / **かけら** / 予定(owner) / 体調(owner) / 設定。

### 命名決定（本人確定）
- 正式名称=**会話のかけら** ／ ナビ短縮=**かけら** ／ 保存ボタン=**会話のかけらに残す** ／ 保存前=保存候補
- カード小バッジ=**かけら** ／ 空表示=**まだ残した会話のかけらはありません** ／ チャット提案=**🗒 この会話、残しておく？** ／ 保存トースト=**会話のかけらに残しました**
- 内部の型・変数は `memo` のまま（意図的）。「候補」の機械置換はしていない。

## 6. Vanilla版から維持した機能
- 全画面のコピー・レイアウト・トークン（`index.css` は元 `<style>` を**そのまま移植**）。
- owner 判定（`?owner=true` → localStorage `oshi-os-owner`）と owner-only 表示制御（`body.is-owner` CSS）。
- 無料プラン件数制限（タスク/かけら/予定 各3件）・お守りモード時のタスク3件制限。
- チャットのローカル応答テーブル（トリガー語→定型応答＋保存候補）・トーン変換・typing演出。
- テーマ切替（light/dark・永続）・トースト・アバター即時プレビュー。
- **自動保存しない不変条件**：AIは候補提案のみ、保存ボタン押下＝ユーザー確認後にだけ保存。

## 7. localStorage 互換性と移行処理
- **キーは Vanilla版と完全一致**（`src/lib/repository.ts` に集約）：
  `oshi` / `theme` / `oshi-os-owner` / `obdone` / `planItems` / `hlogs` / `pstart` / `pin` / `plan`
- よって**移行処理は不要**（同一オリジンなら既存データをそのまま読む）。
- 永続化する：推し設定・テーマ・予定・体調ログ・生理状態・プラン種別・オンボ完了・owner。
- **セッション内保持のみ（非永続）**：タスク・会話のかけら ← Vanilla版と同一挙動。永続化は次フェーズ（会話のかけら基盤）で対応予定。**これは既知の意図的仕様**。
- 永続化は Repository インターフェース経由のみ（将来 Supabase 等へ差し替え可能に分離）。

## 8. 未実装の Figma v2.1 項目（次フェーズ）
- ナビ **5タブ化＋「整理」統合**（v2.1: ホーム/チャット/整理/体調/設定）。現状は6タブ（+owner隠し）。
- 会話のかけらの **元会話・日付・任意タグ保持／詳細画面（memo-detail）／タスク・予定への確認付き変換／再提案／保存後undo**。
- **premium-nudge-sheet**（そっと出るシート）。現状はプラン画面のみ。`DEPRECATED_旧premium-preview` は**実装禁止**。
- 状態画面群：home-empty / loading / chat-limit / chat-error / chat-offline / **ai-send-off** / chat-empty-history / delete-confirm / undo-toast / memos-empty / memos-search-empty / memo-edit-discard。
- **privacy** 画面。
- 生理記録の **課金アドオン施錠**（health-menstrual-locked）。現状は owner に無料開放。
- オンボーディング **4ステップ化**（現状3）。

## 9. 起動コマンドとPC／スマホ確認URL
```bash
cd 01_ACTIVE_PROJECTS_作業中/oshi-life-os
npm install          # 初回のみ
npm run dev          # 起動。ログの "Local" 行のURLを見る
```
- **PC確認**：`http://localhost:5173/`（5173が使用中なら 5174 等に自動で繰り上がる＝起動ログを確認）
- **owner画面（予定・体調・プラン）確認**：`http://localhost:5173/?owner=true`
- **スマホ表示**：Chrome の「デバイスツールバー」で幅 **390px**（本番の見え方）
- ビルド：`npm run build`（`dist/` 出力） ／ ビルド確認：`npm run preview`
- 型チェック：`npm run typecheck`

## 10. typecheck / test / lint / build 結果
| 項目 | コマンド | 結果 |
|---|---|---|
| typecheck | `npm run typecheck`（`tsc --noEmit`） | **エラー0** ✅ |
| build | `npm run build`（`tsc && vite build`） | **成功** ✅ 51 modules／JS 178.65kB(gzip 58.18kB)・CSS 17.35kB |
| test | （未設定） | **未導入**（UIのみ・テスト対象なし。vitest 導入は次フェーズ提案） |
| lint | （未設定） | **未導入**（eslint 未導入。型検査で静的担保。次フェーズ提案） |
| 実機動作 | ブラウザ（owner含む） | 全9画面マウント・生理開始→永続化・お守り詳細・コンソールエラー0（現行サーバー） |

> package.json scripts: `dev / build / preview / typecheck` のみ（`test`・`lint` は無い）。

## 11. Codex に重点監査してほしい箇所
1. **`src/state/AppContext.tsx`（最重点・498行）**
   - 命令的DOM操作→React状態駆動の移植が挙動を変えていないか。
   - `saveCandidate` が `setChatItems` updater 内で `setTodos/setMemos/setPlanItems` を呼ぶ設計 → **StrictMode二重実行時の重複保存**・updater純粋性のリスク。
   - `sendChat` の `setTimeout`（typing→reply→candidate）で **アンマウント後 setState / タイマーリーク**が無いか。
   - `TodoModal.tsx` / `MemoModal.tsx` の `useEffect` exhaustive-deps 抑制箇所の妥当性。
2. **「自動保存しない」不変条件**が全経路（チャット候補・各モーダル）で守られているか。承認前に永続化される穴が無いか。
3. **localStorage 互換**：キーの取りこぼし、`repository.ts` の JSON パース失敗時フォールバック、todo/memo 非永続が意図どおりか。
4. **Vanilla版との差分**：`index.css` 忠実移植の欠落・コピー相違・owner-only 表示（`body.is-owner` CSS依存）の安全性。
5. **生理サイクルの日付計算**（`Health.tsx`：`Date.now()` 基準・タイムゾーン・日跨ぎ）。
6. **課金導線の安全性**：`Plan.tsx` が実決済を一切呼ばないモックであること（Vanilla同様）。将来の実課金差し込み前提の危険な痕跡が無いか。
7. **アクセシビリティ**（Vanillaから継承の弱点）：チェックボックスが `div`、フォーカス可視、タップ44px、色のみ依存。
8. **命名の一貫性**：ユーザー向け=会話のかけら/かけら、内部=memo の境界が崩れていないか。

---
（このファイルは引き継ぎ用ドキュメント。コードの追加修正・整形・削除・commit/push/deploy・タグ作成はしていません。）

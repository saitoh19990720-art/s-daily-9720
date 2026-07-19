# 推し生活OS（oshi-life-os）

推しとの会話の副産物として、タスク・予定・体調・「会話のかけら」が自然に整っていくモバイルOS。
**React + TypeScript + Vite** 版。すべてこの端末（ブラウザ）内で動き、外部にデータを送りません。

> 正本デザイン：Figma「推し生活OS ワイヤーフレーム v2.1（MVP Source of Truth）」。
> 本リポジトリは Vanilla HTML 版 `../oshi-os-demo/index.html` からの移行版です（旧版は保全のため残しています）。

## 起動方法

```bash
cd oshi-life-os
npm install      # 初回だけ
npm run dev      # http://localhost:5173
```

- 型チェック：`npm run typecheck`
- 本番ビルド：`npm run build`（`dist/` に出力）
- ビルド確認：`npm run preview`

スマホ表示は Chrome の「スマホ切替」で幅 **390px** にすると本番の見え方になります。

## 画面（下タブ）

ホーム / 話す（チャット）/ タスク / **かけら（会話のかけら）** / 設定
※ owner モード（`?owner=true`）でのみ表示：予定・体調・プラン。

## 実装状況（React移行フェーズ2 完了時点）

**移植済み（全9画面）**：オンボーディング・ホーム・チャット（保存候補の提案→確認→保存／自動保存なし）・タスク・会話のかけら・予定・体調・プラン（課金モック）・設定。
**次フェーズ**：Figma v2.1 準拠化（5タブ・整理統合など）、および「会話のかけら」基盤（元会話・日付・タグ保持＋永続化＋詳細＋タスク/予定変換）。

## データ

- 保存先：ブラウザの `localStorage`。キーは Vanilla 版と同一（`oshi` / `theme` / `planItems` / `hlogs` / `pstart` / `pin` / `plan` / `obdone` / `oshi-os-owner`）。
- 永続化は `src/lib/repository.ts`（Repository層）に集約。将来 Supabase 等へ差し替え可能。
- タスク・会話のかけらは Vanilla 版と同じくセッション内保持（永続化は「会話のかけら基盤」フェーズで対応）。
- 秘密情報（パスワード・トークン等）は保存しません。

## 技術

React 18 / TypeScript 5 / Vite 5 / localStorage。追加ライブラリなし。
UIフォント（Zen Kaku Gothic New / Shippori Mincho）は Google Fonts から読み込み、オフライン時は端末標準へフォールバック。

## 命名（会話のかけら）

メモ機能のユーザー向け正式名称は **会話のかけら**（ナビ短縮=かけら／保存ボタン=会話のかけらに残す／保存前=保存候補）。
内部の型・変数は移行段では `memo` のまま。

## フォルダ構成

```
src/
  main.tsx / App.tsx / index.css   … エントリ・シェル・移植CSS
  lib/      types.ts / repository.ts / constants.ts
  state/    AppContext.tsx          … 状態・アクション集約
  components/ TabBar / Toast / Modal / TodoModal / MemoModal / PlanModal / TodoItem / TopBits
  screens/  Onboarding / Home / Chat / Todo / Memo / PlanList / Health / Plan / Settings
```

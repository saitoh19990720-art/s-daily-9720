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

ホーム / チャット / **整理（タスク・かけら・予定）** / 体調 / 設定
※ プラン画面は設定内の導線から開きます。

## 実装状況（React移行フェーズ2 完了時点）

**移植済み（全9画面）**：オンボーディング・ホーム・チャット（保存候補の提案→確認→保存／自動保存なし）・タスク・会話のかけら・予定・体調・プラン（課金モック）・設定。
**Figma v2.1対応済み**：5タブ化と「整理」へのタスク・会話のかけら・予定の統合。
**③-B-1対応済み**：タスク・会話のかけらの永続化、保存元と必要最小限の元会話保持、保存失敗時のデータ保護。
**次フェーズ（③-B-2）**：会話のかけらの詳細・タグ編集・タスク/予定変換UI。

## データ

- 保存先：ブラウザの `localStorage`。Vanilla版の既存キー（`oshi` / `theme` / `planItems` / `hlogs` / `pstart` / `pin` / `plan` / `obdone` / `oshi-os-owner`）は変更せず、新規に `oshi-os:v1:todos` / `oshi-os:v1:fragments` を使用します。
- 永続化は `src/lib/repository.ts`（Repository層）に集約。将来 Supabase 等へ差し替え可能。
- タスク・会話のかけらは `{ schemaVersion: 1, records: [...] }` 形式で保存し、破損・不正レコードは読み込み時に安全に除外します。
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
  screens/  Onboarding / Home / Chat / Organize / Todo / Memo / PlanList / Health / Plan / Settings
```

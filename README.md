# 推し生活OS（Oshi Life OS）v0.1

> **推しと話すだけで、TODO・メモ・体調・予定が少し整うアプリ。**
> 生活管理をするために開くのではなく、推しに会いに行った結果、生活が整っていた——を目指す。

スマホで使える Web アプリ（PWA）。ホーム画面に追加すると、アプリのように起動できる。

## 起動方法

```bash
npm install
npm run dev      # ローカル起動
npm run build    # 本番ビルド（docs/）
npm run preview  # ビルド結果の確認
```

公開URLをスマホで開く →「ホーム画面に追加」でアプリ化。

## 技術スタック

React 18 + TypeScript / Vite / Tailwind CSS（CSS変数でLight/Dark）/ lucide-react / PWA（manifest）。
データは **localStorage**（端末内のみ・外部送信なし）。

## 実装済み機能（v0.1）

- 推し人格テキストチャット（性格タグ16・口調・一人称/二人称・口癖・性格核・NG/禁止・3モード=秘書/友達/推し）
- **チャット候補抽出**：会話から TODO/メモ/予定/体調 の候補を拾い、ワンタップで保存（芯）
- TODO（追加・完了・編集・削除）／メモ（フリー入力）
- 体調（気分・痛み・症状・生理サイクル・**カレンダー**・**次の生理予測**・日ごと記録）
- 予定（ScheduleItem・カテゴリ task/fun/care/rest）
- **お守りモード**（自動＝生理中/夜/つらい日 ＋手動）：やさしく・急かさず・休む選択を先に
- 推しアバター画像アップロード（端末内・圧縮）
- 生活サポート傾向（ほめる/見守る/休ませる 等）
- Light/Dark テーマ
- **スマホ＝下部ナビ／PC＝左サイドバー**（レスポンシブ）
- 設定からキャラのAIシステムプロンプトを生成・コピー

## 未実装機能（v0.1では入れない）

音声通話・音声合成・ボイス／Googleアカウント連携・Gmail・Google Calendar本連携・Appleヘルスケア／本物のプッシュ通知／複数推し管理／課金処理の本番実装／3D推し部屋・AR／SNS連携／Obsidian同期・n8n本接続／アプリ内AIの本接続（現在はローカルのルールベース応答＋将来AIに繋ぐ準備のみ）。

## 将来構想

`docs/DEVELOPER_MEMO.md` を参照（Zeta×Cotomo×Geminiの統合構想／音声／Google連携 等）。
v0.2＝会話テンポ・朝/昼/夜の話しかけ・寝る前モード。v0.3＝通知文生成・予定要約。v1.0＝音声・Google連携。

## 設計の原則

- **参考アプリ要素は「薄く摘み取る」だけ**（Zeta/Cotomo/Gemini/Finch/Daylio/TickTick 等）。どれも主役にしない。独自体験＝「推しと話す→生活の断片が拾われる→性格に合わせて少し整う」。
- v0.1では **外部連携・音声・本課金は実装していない**。
- アプリ同一性ガード：説明文「推しと話すだけで、TODO・メモ・体調・予定が少し整うアプリ。」が変わる機能は入れない（詳細は `CLAUDE.md`）。
- 課金UIはあるが処理は未実装。記録データはどのプランでも端末に残る。

## フォルダ構成

```
src/
  screens/     Onboarding / Home / Chat / Todo / Memo / Health / Plan / Settings
  components/  ui / BottomNav / SideNav / Avatar / Calendar
  lib/         oshi（返事＋プロンプト生成）/ extract（チャット候補抽出）/ date / period（生理予測）
  store.tsx    localStorage 状態管理
  types.ts     データ型
```

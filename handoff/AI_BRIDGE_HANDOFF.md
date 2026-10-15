# AI Bridge 共通引継ぎ

## 現在の状態（2026-10-15、日本時間）

- リポジトリ：saitoh19990720-art/s-daily-9720（公開）
- origin：https://github.com/saitoh19990720-art/s-daily-9720.git
- ローカル作業パス：C:\Users\NEC-PCuser\oshi-life-os
- main：React + TypeScript + Vite 版（a971b2a）。正本。
- 作業ブランチ：chore/ai-bridge-handoff-react（mainから分岐。本ファイル・AGENTS.md・memo/をローカルcommit。push未実施）
- 公開サイト：GitHub Pages は `legacy/tailwind-v0.1` `/docs` から旧Tailwind版を配信中。React版は未公開。
- 自動連携：OFF（運用方針）。

## DONE（2026-10-15、すべて人間の明示承認による）

1. 旧Tailwind版を `legacy/tailwind-v0.1`（1588909）に保全済みであることを確認。
2. Pages配信元を `main` `/docs` → `legacy/tailwind-v0.1` `/docs` に変更。再ビルド成功、同URLで表示・consoleエラーなしを確認。
3. GitHub上でブランチ名を付け替え（削除・強制上書きなし）：
   - 旧 `main`（Tailwind版 1588909）→ `archive/main-tailwind`
   - `checkpoint/local-react-v2-584dd4e2`（React版 a971b2a）→ `main`
   - 既定ブランチを `main` に設定
4. 取り込み漏れ確認：作業ブランチ5本（agent/home-normal、codex/fix-tokyo-today-initial-sync、feat/home-alarm-card、feat/safe-avatar-compression、fix/tokyo-midnight）はすべてReact版に取り込み済み（未取り込みコミット0件）。開いているPRなし。
5. ローカルの main を新mainに合わせ、本ブランチを作成。旧Tailwind版向けに書いた引継ぎ文書（ブランチ `chore/ai-bridge-handoff`、ローカルのみ・未push）を、React版向けに書き直した。

## 戻し方

GitHubでブランチ名を逆に付け替える（`main` → `checkpoint/local-react-v2-584dd4e2`、`archive/main-tailwind` → `main`、既定ブランチを戻す）。Pages配信元は `main` `/docs` に戻す。どのコミットも削除していない。

## REMAINING（人間の判断待ち）

- 本ブランチのpush・mainへの取り込み（承認が必要）。
- React版の公開方法と時期（Pagesの配信元変更 or 別サービス）。
- `archive/main-tailwind` と `legacy/tailwind-v0.1` は同じコミット。片方を整理するかは保留（削除は承認が必要）。
- 取り込み済みの作業ブランチ5本の整理（削除は承認が必要）。
- ローカルの旧ブランチ `chore/ai-bridge-handoff`（未push）は保全のため残している。

## 検証記録（2026-10-15、main a971b2a 相当）

- `npm ci`：成功（143パッケージ）。
- `npm run typecheck`：成功。
- `npm run build`：成功（dist/ に出力。dist/ は .gitignore 済み）。
- テスト：13ファイル・126件すべて成功（`npx vitest run --no-file-parallelism --maxWorkers=1`）。
- 注意：このPCは空きメモリが少なく（約0.65GB）、`npm test`（並列実行）ではワーカーがメモリ不足で落ちる。コードの不具合ではない。このPCでは上の直列実行コマンドを使う。設定ファイルへの反映は未実施（人間の判断待ち）。

## 未確認
- 他のAIや別PCに、React版の未push作業が残っていないか。
- 各AIの自動読込、端末全体の既存自動化や停止状態は未監査。

## BACKLOG

ChatGPT→Claude Code/Cursor自動連携。権限・承認ゲート・停止方法を具体化し、別途人間が明示承認するまでは有効化しない。

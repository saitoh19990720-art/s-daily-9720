// 会話のかけら（内部名 memo）画面。Vanilla版 scr-memo の構造を保持し、
// ユーザー向け表示名のみ命名決定を反映：正式名称=会話のかけら／バッジ=かけら。
import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { ThemeButton } from '../components/TopBits'

export function MemoContent() {
  const { memos, openMemoModal, openFragmentDetail } = useApp()
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLocaleLowerCase()
  // 本文とタグの両方を検索対象にする。
  const filtered = memos.filter(
    (memo) =>
      memo.text.toLocaleLowerCase().includes(normalized) ||
      memo.tags.some((tag) => tag.toLocaleLowerCase().includes(normalized)),
  )

  return (
    <section className="organize-panel organize-fragments" aria-labelledby="organize-tab-fragments">
      <label className="organize-search">
        <span aria-hidden="true">🔍</span>
        <span className="sr-only">会話のかけらを検索</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="会話のかけらを検索..."
        />
      </label>
      {filtered.length === 0 ? (
        <div className="empty organize-empty">
          {memos.length === 0 ? 'まだ残した会話のかけらはありません' : '一致する会話のかけらはありません'}
        </div>
      ) : (
        <div className="organize-fragment-list">
          {filtered.map((memo) => {
            const preview = memo.text.length > 40 ? `${memo.text.slice(0, 40)}…` : memo.text
            return (
              <button
                type="button"
                className="card organize-fragment-card fragment-card-btn"
                key={memo.id}
                onClick={() => openFragmentDetail(memo.id)}
                aria-label={`${preview} の詳細を開く`}
              >
                <div className="organize-card-meta">
                  <span>{memo.date}</span>
                  <span>{memo.source === 'chat' ? '💬 会話から' : '✍️ 手動'}</span>
                </div>
                <div className="mi-text">{memo.text}</div>
                <div className="fragment-card-foot">
                  <span className="memo-badge">かけら</span>
                  {memo.tags.length > 0 && (
                    <span className="fragment-card-tags">
                      {memo.tags.slice(0, 3).map((tag, index) => (
                        <span key={`${index}:${tag}`} className="fd-tag fd-tag-sm">
                          {tag}
                        </span>
                      ))}
                      {memo.tags.length > 3 && <span className="fragment-card-more">+{memo.tags.length - 3}</span>}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
      <button className="organize-fab" onClick={() => openMemoModal()} aria-label="会話のかけらに残す">
        ＋
      </button>
    </section>
  )
}

export default function Memo() {
  const { memos, openMemoModal } = useApp()
  return (
    <div className="screen on">
      <div className="topbar">
        <span className="topbar-title">🗒 会話のかけら</span>
        <div className="topbar-right">
          <span className="topbar-sub">{memos.length ? `${memos.length}件` : ''}</span>
          <button className="btn btn-primary btn-sm" onClick={() => openMemoModal()}>
            ＋ 追加
          </button>
          <ThemeButton />
        </div>
      </div>
      <div className="scroll">
        <MemoContent />
      </div>
    </div>
  )
}

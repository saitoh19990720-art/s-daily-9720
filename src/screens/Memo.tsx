// 会話のかけら（内部名 memo）画面。Vanilla版 scr-memo の構造を保持し、
// ユーザー向け表示名のみ命名決定を反映：正式名称=会話のかけら／バッジ=かけら。
import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { ThemeButton } from '../components/TopBits'

export function MemoContent() {
  const { memos, openMemoModal, deleteMemo } = useApp()
  const [query, setQuery] = useState('')
  const filtered = memos.filter((memo) => memo.text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))

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
            const index = memos.indexOf(memo)
            return (
              <article className="card organize-fragment-card" key={`${memo.date}-${index}`}>
                <div className="organize-card-meta">
                  <span>{memo.date}</span>
                  <span>💬 会話から保存</span>
                </div>
                <div className="mi-text">{memo.text}</div>
                <span className="memo-badge">かけら</span>
                <div className="mi-acts">
                  <button className="btn btn-ghost btn-sm" onClick={() => openMemoModal(index)} aria-label={`${memo.text}を編集`}>
                    編集
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteMemo(index)} aria-label={`${memo.text}を削除`}>
                    削除
                  </button>
                </div>
              </article>
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

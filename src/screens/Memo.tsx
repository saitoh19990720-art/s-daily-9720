// 会話のかけら（内部名 memo）画面。Vanilla版 scr-memo の構造を保持し、
// ユーザー向け表示名のみ命名決定を反映：正式名称=会話のかけら／バッジ=かけら。
import { useApp } from '../state/AppContext'
import { ThemeButton } from '../components/TopBits'

export default function Memo() {
  const { memos, openMemoModal, deleteMemo } = useApp()
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
        {memos.length === 0 ? (
          <div className="empty" style={{ padding: '20px 2px' }}>
            まだ残した会話のかけらはありません
          </div>
        ) : (
          memos.map((m, i) => (
            <div className="card" key={i}>
              <span className="memo-badge">かけら</span>
              <div className="mi-text" style={{ marginTop: 6 }}>
                {m.text}
              </div>
              <div className="mi-date">{m.date}</div>
              <div className="mi-acts">
                <button className="btn btn-ghost btn-sm" onClick={() => openMemoModal(i)} aria-label={`${m.text}を編集`}>
                  編集
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteMemo(i)} aria-label={`${m.text}を削除`}>
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

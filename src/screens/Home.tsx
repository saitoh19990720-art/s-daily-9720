// ホーム。Figma正本 v2.1「✅ v2.1 — MVP Source of Truth / home-normal」(node 112:1758) に合わせて再構成。
// 構造：oshi-profile-header → greeting-section → daily-agenda（今日やること / 今日の予定 / 最近のメモ）。
// status-bar と home-indicator は端末側が描くクロムなので、アプリUIとしては実装しない。
import { useApp } from '../state/AppContext'
import { Avatar, OmamoriBadge } from '../components/TopBits'
import TodoItem from '../components/TodoItem'
import { tokyoDateTime } from '../lib/date'
import { useTokyoToday } from '../lib/useTokyoToday'

// ホームはダイジェスト。かけらの全件は「整理」で見る。
const RECENT_MEMO_COUNT = 3

export default function Home() {
  const { oshi, dispName, todos, planItems, memos, setScreen } = useApp()
  const name = dispName(oshi.name)
  // 「今日やること」＝期限が今日（東京時間）のタスクだけ。完了済みもその日中は残す
  // （チェックした手応えが残り、解除して戻せる）。
  // 期限切れ・期限なし・明日以降はホームに出さない（それらは「整理」で見る）。
  // 日付は東京0時と画面復帰のタイミングで取り直す（開きっぱなしでも前日のまま残さない）。
  const today = useTokyoToday()
  const todayTodos = todos.filter((todo) => todo.due === today)
  const recentMemos = memos.slice(0, RECENT_MEMO_COUNT)

  return (
    <div className="screen on">
      <header className="v21-profile">
        <Avatar cls="av-40" img={oshi.avatarImg} />
        <div className="v21-profile-info">
          <h1 className="v21-profile-name">{name}</h1>
          <p className="v21-status">
            <span className="v21-status-dot" aria-hidden="true" />
            <span className="v21-status-text">ONLINE</span>
          </p>
        </div>
        <OmamoriBadge />
      </header>

      <div className="scroll">
        <section className="v21-greeting" aria-label={`${name}からのひとこと`}>
          <p className="v21-bubble">
            おかえり、今日も一緒にいるよ。何か気になっていることがあったら、僕に教えてほしいな。
          </p>
          <button className="btn v21-talk-btn" onClick={() => setScreen('chat')}>
            🎙 {name}とはなす
          </button>
        </section>

        <div className="v21-agenda">
          <section className="v21-section">
            <h2 className="v21-section-title">今日やること</h2>
            {todayTodos.length > 0 ? (
              <div className="todo-list">
                {todayTodos.map((todo) => (
                  <TodoItem key={todo.id} todo={todo} variant="compact" />
                ))}
              </div>
            ) : (
              <p className="empty">タスクは「整理」から🌙</p>
            )}
          </section>

          <section className="v21-section">
            <h2 className="v21-section-title">今日の予定</h2>
            {planItems.length > 0 ? (
              <div className="plan-list">
                {planItems.map((item, idx) => (
                  <div className="pi" key={`${item.time}-${item.text}-${idx}`}>
                    {item.time && (
                      <>
                        <span className="pi-time">{item.time}</span>
                        <span className="v21-divider" aria-hidden="true" />
                      </>
                    )}
                    <span className="v21-plan-text">{item.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty">予定は「整理」から🌙</p>
            )}
          </section>

          <section className="v21-section">
            <h2 className="v21-section-title">最近のメモ</h2>
            {recentMemos.length > 0 ? (
              <div className="memo-list">
                {recentMemos.map((memo) => (
                  <div className="mi" key={memo.id}>
                    <p className="mi-text">{memo.text}</p>
                    <p className="mi-date">作成：{tokyoDateTime(memo.createdAt) || memo.date}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty">かけらはチャットから残せる🌙</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// ホーム。Vanilla版 scr-home の構造・コピーを保持。
import { useApp } from '../state/AppContext'
import { Avatar, OmamoriBadge, ThemeButton } from '../components/TopBits'
import TodoItem from '../components/TodoItem'

const DOW = ['日', '月', '火', '水', '木', '金', '土']

export default function Home() {
  const { owner, oshi, dispName, todos, setScreen } = useApp()
  const name = dispName(oshi.name)
  const total = todos.length
  const done = todos.filter((t) => t.done).length

  const now = new Date()
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(
    now.getDate(),
  ).padStart(2, '0')} ${DOW[now.getDay()]}曜日`
  const greeting = owner ? `おかえり、${oshi.callname || 'きみ'}。` : 'ようこそ。'

  return (
    <div className="screen on">
      <div className="topbar">
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{dateStr}</div>
          <div style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 16, color: 'var(--text)' }}>
            {greeting}
          </div>
        </div>
        <div className="topbar-right">
          <OmamoriBadge />
          <ThemeButton />
        </div>
      </div>
      <div className="scroll">
        <div className="card oshi-card" style={{ marginBottom: 20 }}>
          <div className="oshi-row">
            <Avatar cls="av-48" img={oshi.avatarImg} />
            <div>
              <div className="oshi-msg-label">{name} — 今日のひとこと</div>
              <div className="oshi-msg-text">「今日、何かやり残してることある？ 話してみて」</div>
            </div>
          </div>
          <button className="btn btn-primary btn-full" onClick={() => setScreen('chat')}>
            {name}と話す →
          </button>
        </div>
        <div>
          <div className="sec-header">
            <span className="sec-title">今日の最重要</span>
            <span className="sec-count">{total ? `${done}/${total}` : ''}</span>
          </div>
          <div className="todo-list">
            {todos.map((t) => (
              <TodoItem key={t.id} todo={t} />
            ))}
          </div>
          {total === 0 && (
            <div className="empty" style={{ textAlign: 'center', padding: '14px 0' }}>
              タスクは「整理」から🌙
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

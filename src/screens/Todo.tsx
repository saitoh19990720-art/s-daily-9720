// タスク画面。Vanilla版 scr-todo を保持。
import { useApp } from '../state/AppContext'
import { ThemeButton } from '../components/TopBits'
import TodoItem from '../components/TodoItem'

export default function Todo() {
  const { todos, openTodoModal } = useApp()
  const total = todos.length
  const done = todos.filter((t) => t.done).length
  return (
    <div className="screen on">
      <div className="topbar">
        <span className="topbar-title">📋 タスク</span>
        <div className="topbar-right">
          <span className="topbar-sub">{total ? `${done}/${total} 完了` : ''}</span>
          <button className="btn btn-primary btn-sm" onClick={() => openTodoModal()}>
            ＋ 追加
          </button>
          <ThemeButton />
        </div>
      </div>
      <div className="scroll">
        <div className="card">
          <div className="todo-list">
            {todos.map((t) => (
              <TodoItem key={t.id} todo={t} />
            ))}
          </div>
          <button
            className="btn btn-ghost btn-full"
            onClick={() => openTodoModal()}
            style={{ marginTop: 10 }}
          >
            ＋ タスクを追加
          </button>
        </div>
      </div>
    </div>
  )
}

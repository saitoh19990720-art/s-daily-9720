// タスク画面。Vanilla版 scr-todo を保持。
import { useApp } from '../state/AppContext'
import { ThemeButton } from '../components/TopBits'
import TodoItem from '../components/TodoItem'

export function TodoContent() {
  const { todos, openTodoModal } = useApp()
  return (
    <section className="organize-panel" aria-labelledby="organize-tab-tasks">
      <button className="organize-add" onClick={() => openTodoModal()}>
        ＋ 新しくタスクを追加
      </button>
      {todos.length === 0 ? (
        <div className="empty organize-empty">まだタスクはありません</div>
      ) : (
        <div className="todo-list">
          {todos.map((todo) => <TodoItem key={todo.id} todo={todo} />)}
        </div>
      )}
    </section>
  )
}

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
        <TodoContent />
      </div>
    </div>
  )
}

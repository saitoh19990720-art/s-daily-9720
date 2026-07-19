// タスク1件。ホーム/タスク画面で共通利用。Vanilla版 addTodoItem のマークアップを保持。
import { useApp } from '../state/AppContext'
import type { Todo } from '../lib/types'

export default function TodoItem({ todo }: { todo: Todo }) {
  const { toggleTodo, deleteTodo, openTodoModal } = useApp()
  return (
    <div className={`ti${todo.done ? ' done' : ''}`}>
      <div className={`prio-dot ${todo.prio}`} />
      <div className="tck" onClick={() => toggleTodo(todo.id)}>
        <span className="tck-i">✓</span>
      </div>
      <div className="ti-body">
        <div className="ti-text">{todo.text}</div>
      </div>
      <div className="ti-acts">
        <button className="btn-icon" onClick={() => openTodoModal(todo.id)}>
          ✏️
        </button>
        <button className="btn-icon del" onClick={() => deleteTodo(todo.id)}>
          🗑
        </button>
      </div>
    </div>
  )
}

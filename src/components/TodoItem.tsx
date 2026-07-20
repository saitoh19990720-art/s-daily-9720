// タスク1件。ホーム/タスク画面で共通利用。Vanilla版 addTodoItem のマークアップを保持。
import { useApp } from '../state/AppContext'
import type { Todo } from '../lib/types'

export default function TodoItem({ todo }: { todo: Todo }) {
  const { toggleTodo, deleteTodo, openTodoModal } = useApp()
  return (
    <div className={`ti${todo.done ? ' done' : ''}`}>
      <div className={`prio-dot ${todo.prio}`} aria-hidden="true" />
      <button
        type="button"
        className="tck"
        onClick={() => toggleTodo(todo.id)}
        aria-pressed={todo.done}
        aria-label={todo.done ? `${todo.text}を未完了に戻す` : `${todo.text}を完了にする`}
      >
        <span className="tck-i">✓</span>
      </button>
      <div className="ti-body">
        <div className="ti-text">{todo.text}</div>
      </div>
      <div className="ti-acts">
        <button className="btn-icon" onClick={() => openTodoModal(todo.id)} aria-label={`${todo.text}を編集`}>
          ✏️
        </button>
        <button className="btn-icon del" onClick={() => deleteTodo(todo.id)} aria-label={`${todo.text}を削除`}>
          🗑
        </button>
      </div>
    </div>
  )
}

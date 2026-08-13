// タスク1件。ホーム/タスク画面で共通利用。Vanilla版 addTodoItem のマークアップを保持。
import { useApp } from '../state/AppContext'
import type { Prio, Todo } from '../lib/types'

// v2.1ホーム（Figma 112:1788）は優先度をドットではなく文字で出す。
// 「中」だけはFigmaに見本が無いため、高/低と同じ書式で補った（要デザイン確認）。
const PRIO_LABEL: Record<Prio, string> = {
  high: '⚠️ 優先度: 高',
  mid: '⏳ 優先度: 中',
  low: '☕ 優先度: 低',
}

// variant:
//   default … 整理画面など従来の使い方（優先度ドット＋編集/削除ボタン）
//   compact … v2.1ホーム（Figma 112:1786「チェック＋本文」）。編集/削除はホームに出さない。
//             機能自体は残っていて、整理画面から従来どおり編集・削除できる。
export default function TodoItem({
  todo,
  variant = 'default',
}: {
  todo: Todo
  variant?: 'default' | 'compact'
}) {
  const { toggleTodo, deleteTodo, openTodoModal } = useApp()
  const compact = variant === 'compact'
  return (
    <div className={`ti${todo.done ? ' done' : ''}`}>
      {!compact && <div className={`prio-dot ${todo.prio}`} aria-hidden="true" />}
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
        {compact && <div className="ti-prio">{PRIO_LABEL[todo.prio]}</div>}
      </div>
      {!compact && (
        <div className="ti-acts">
          <button className="btn-icon" onClick={() => openTodoModal(todo.id)} aria-label={`${todo.text}を編集`}>
            ✏️
          </button>
          <button className="btn-icon del" onClick={() => deleteTodo(todo.id)} aria-label={`${todo.text}を削除`}>
            🗑
          </button>
        </div>
      )}
    </div>
  )
}

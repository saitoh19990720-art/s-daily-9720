// 画面上部トースト。Vanilla版 showToast の見た目を保持。
import { useApp } from '../state/AppContext'

export default function Toast() {
  const { toast } = useApp()
  return (
    <div className={`toast${toast ? ' show' : ''}`} role="status" aria-live="polite" aria-atomic="true">
      {toast}
    </div>
  )
}

// 各画面のトップバーで使い回す小部品。Vanilla版の見た目・挙動を保持。
import { useApp } from '../state/AppContext'

export function ThemeButton() {
  const { theme, toggleTheme } = useApp()
  return (
    <button className="theme-btn" onClick={toggleTheme}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

export function OmamoriBadge() {
  const { omamoriOn } = useApp()
  if (!omamoriOn) return null
  return <div className="mode-badge omamori">🧿 お守りモード中</div>
}

export function Avatar({ cls, img }: { cls: string; img: string | null }) {
  return (
    <div className={`av ${cls}`}>{img ? <img src={img} alt="" /> : <span>🌙</span>}</div>
  )
}

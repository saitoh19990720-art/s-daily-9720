// 各画面のトップバーで使い回す小部品。Vanilla版の見た目・挙動を保持。
import { useApp } from '../state/AppContext'

export function ThemeButton() {
  const { themePreference, toggleTheme } = useApp()
  const labels = {
    light: { icon: '☀️', text: 'Light' },
    dark: { icon: '🌙', text: 'Dark' },
    system: { icon: '◐', text: 'System' },
  } as const
  const current = labels[themePreference]
  return (
    <button
      className="theme-btn"
      onClick={toggleTheme}
      aria-label={`テーマ: ${current.text}。押すと切り替えます`}
      title={`テーマ: ${current.text}`}
    >
      <span aria-hidden="true">{current.icon}</span>
      <span className="theme-label">{current.text}</span>
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

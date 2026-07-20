// 下タブバー。Vanilla版のナビ構造・アイコン・owner-only 制御を保持。
// 命名決定：メモタブの表示名のみ「メモ」→「かけら」（正式名称=会話のかけら の短縮）。構造は不変。
import { useApp } from '../state/AppContext'
import type { Screen } from '../lib/types'
import type { ReactNode } from 'react'

interface Tab {
  key: Screen
  label: string
  ownerOnly?: boolean
  icon: ReactNode
}

const svg = (children: ReactNode) => (
  <svg className="nb-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    {children}
  </svg>
)

const TABS: Tab[] = [
  { key: 'home', label: 'ホーム', icon: svg(<><path d="M3 12L12 3l9 9" /><path d="M5 10v10h14V10" /></>) },
  { key: 'chat', label: '話す', icon: svg(<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />) },
  { key: 'todo', label: 'タスク', icon: svg(<><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" /></>) },
  { key: 'memo', label: 'かけら', icon: svg(<path d="M14 3v5h5M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8l-6-5z" />) },
  { key: 'planlist', label: '予定', ownerOnly: true, icon: svg(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>) },
  { key: 'health', label: '体調', ownerOnly: true, icon: svg(<path d="M22 12h-4l-3 9L9 3l-3 9H2" />) },
  { key: 'settings', label: '設定', icon: svg(<circle cx="12" cy="12" r="3" />) },
]

export default function TabBar() {
  const { screen, setScreen } = useApp()
  return (
    <nav className="bnav" aria-label="メインナビゲーション">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`nb${t.ownerOnly ? ' owner-only' : ''}${screen === t.key ? ' on' : ''}`}
          onClick={() => setScreen(t.key)}
          aria-current={screen === t.key ? 'page' : undefined}
        >
          {t.icon}
          <span className="nb-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

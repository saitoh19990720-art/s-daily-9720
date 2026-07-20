// 下タブバー。Vanilla版のナビ構造・アイコン・owner-only 制御を保持。
// 命名決定：メモタブの表示名のみ「メモ」→「かけら」（正式名称=会話のかけら の短縮）。構造は不変。
import { useApp } from '../state/AppContext'
import type { Screen } from '../lib/types'
import type { ReactNode } from 'react'

interface Tab {
  key: Screen
  label: string
  icon: ReactNode
}

const svg = (children: ReactNode) => (
  <svg className="nb-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    {children}
  </svg>
)

const TABS: Tab[] = [
  { key: 'home', label: 'ホーム', icon: svg(<><path d="M3 12L12 3l9 9" /><path d="M5 10v10h14V10" /></>) },
  { key: 'chat', label: 'チャット', icon: svg(<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />) },
  { key: 'organize', label: '整理', icon: svg(<><path d="M3 6h6l2 2h10v11a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" /><path d="M3 10h18" /></>) },
  { key: 'health', label: '体調', icon: svg(<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 00-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 000-7.8z" />) },
  { key: 'settings', label: '設定', icon: svg(<circle cx="12" cy="12" r="3" />) },
]

export default function TabBar() {
  const { screen, setScreen } = useApp()
  return (
    <nav className="bnav" aria-label="メインナビゲーション">
      {TABS.map((tab) => {
        const active = screen === tab.key || (screen === 'plan' && tab.key === 'settings')
        return (
          <button
            key={tab.key}
            className={`nb${active ? ' on' : ''}`}
            onClick={() => setScreen(tab.key)}
            aria-current={active ? 'page' : undefined}
          >
            {tab.icon}
            <span className="nb-label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

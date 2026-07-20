import { ThemeButton } from '../components/TopBits'
import type { OrganizeTab } from '../lib/types'
import { useApp } from '../state/AppContext'
import { MemoContent } from './Memo'
import { PlanListContent } from './PlanList'
import { TodoContent } from './Todo'

const TABS: { key: OrganizeTab; label: string }[] = [
  { key: 'tasks', label: 'タスク' },
  { key: 'fragments', label: 'かけら' },
  { key: 'schedule', label: '予定' },
]

export default function Organize() {
  const { organizeTab, setOrganizeTab } = useApp()

  return (
    <div className="screen on organize-screen">
      <div className="topbar organize-topbar">
        <h1 className="topbar-title">整理</h1>
        <div className="topbar-right">
          <ThemeButton />
        </div>
      </div>
      <div className="organize-tabs" role="tablist" aria-label="整理する項目">
        {TABS.map((tab, index) => {
          const selected = organizeTab === tab.key
          return (
            <button
              key={tab.key}
              id={`organize-tab-${tab.key}`}
              role="tab"
              className={selected ? 'on' : ''}
              aria-selected={selected}
              aria-controls="organize-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setOrganizeTab(tab.key)}
              onKeyDown={(event) => {
                let nextIndex = index
                if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length
                else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length
                else if (event.key === 'Home') nextIndex = 0
                else if (event.key === 'End') nextIndex = TABS.length - 1
                else return
                event.preventDefault()
                const nextTab = TABS[nextIndex]
                setOrganizeTab(nextTab.key)
                window.requestAnimationFrame(() => {
                  document.getElementById(`organize-tab-${nextTab.key}`)?.focus()
                })
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div className="scroll organize-scroll">
        <div
          id="organize-panel"
          role="tabpanel"
          aria-labelledby={`organize-tab-${organizeTab}`}
        >
          {organizeTab === 'tasks' && <TodoContent />}
          {organizeTab === 'fragments' && <MemoContent />}
          {organizeTab === 'schedule' && <PlanListContent />}
        </div>
      </div>
    </div>
  )
}

// アプリのシェル。Vanilla版 .app > .screens > (画面) + bnav 構造を保持。
// 画面はアクティブなものだけ描画（Vanilla の .screen.on 切替に相当）。
import { useLayoutEffect, useRef } from 'react'
import { useApp } from './state/AppContext'
import Onboarding from './screens/Onboarding'
import Home from './screens/Home'
import Chat from './screens/Chat'
import Organize from './screens/Organize'
import Health from './screens/Health'
import Plan from './screens/Plan'
import Settings from './screens/Settings'
import TabBar from './components/TabBar'
import Toast from './components/Toast'
import TodoModal from './components/TodoModal'
import MemoModal from './components/MemoModal'
import PlanModal from './components/PlanModal'
import { useVisualViewport } from './lib/useVisualViewport'

export default function App() {
  const { screen, obDone, todoModal, memoModal, planModal } = useApp()
  useVisualViewport()
  const modalOpen = todoModal.open || memoModal.open || planModal.open
  const backgroundBlocked = modalOpen || !obDone
  const appRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const app = appRef.current
    if (!app) return
    if (backgroundBlocked) app.setAttribute('inert', '')
    else app.removeAttribute('inert')
  }, [backgroundBlocked])

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return <Home />
      case 'chat':
        return <Chat />
      case 'organize':
        return <Organize />
      case 'health':
        return <Health />
      case 'plan':
        return <Plan />
      case 'settings':
        return <Settings />
      default:
        return <Home />
    }
  }

  return (
    <>
      {!obDone && <Onboarding />}
      <div ref={appRef} className="app" aria-hidden={backgroundBlocked || undefined}>
        <div className="screens">
          {renderScreen()}
          <TabBar />
        </div>
      </div>
      <TodoModal />
      <MemoModal />
      <PlanModal />
      <Toast />
    </>
  )
}

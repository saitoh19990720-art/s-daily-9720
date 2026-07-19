// アプリのシェル。Vanilla版 .app > .screens > (画面) + bnav 構造を保持。
// 画面はアクティブなものだけ描画（Vanilla の .screen.on 切替に相当）。
import { useApp } from './state/AppContext'
import Onboarding from './screens/Onboarding'
import Home from './screens/Home'
import Chat from './screens/Chat'
import Todo from './screens/Todo'
import Memo from './screens/Memo'
import PlanList from './screens/PlanList'
import Health from './screens/Health'
import Plan from './screens/Plan'
import Settings from './screens/Settings'
import TabBar from './components/TabBar'
import Toast from './components/Toast'
import TodoModal from './components/TodoModal'
import MemoModal from './components/MemoModal'
import PlanModal from './components/PlanModal'

export default function App() {
  const { screen, obDone } = useApp()

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return <Home />
      case 'chat':
        return <Chat />
      case 'todo':
        return <Todo />
      case 'memo':
        return <Memo />
      case 'planlist':
        return <PlanList />
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
      <div className="app">
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

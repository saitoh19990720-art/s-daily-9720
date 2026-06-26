import { useState, type ReactNode } from "react";
import { StoreProvider, useStore } from "./store";
import { BottomNav } from "./components/BottomNav";
import { SideNav } from "./components/SideNav";
import { Onboarding } from "./screens/Onboarding";
import { Home } from "./screens/Home";
import { Chat } from "./screens/Chat";
import { Todo } from "./screens/Todo";
import { Health } from "./screens/Health";
import { Memo } from "./screens/Memo";
import { Plan } from "./screens/Plan";
import { Settings } from "./screens/Settings";
import type { ScreenId } from "./types";

// 外枠：スマホは縦1カラム（下タブ）、PC(md+)は 左サイドバー｜本文。
function Shell({ nav, children }: { nav?: ReactNode; children: ReactNode }) {
  return (
    <div className="app-minh flex justify-center bg-line/40">
      <div className="app-h relative flex w-full max-w-phone overflow-hidden bg-bg shadow-2xl md:max-w-[920px]">
        {nav}
        <div className="relative flex flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function AppShell() {
  const { s } = useStore();
  const [screen, setScreen] = useState<ScreenId>("home");

  if (!s.onboarded) {
    return (
      <Shell>
        <Onboarding />
      </Shell>
    );
  }

  return (
    <Shell nav={<SideNav active={screen} onChange={setScreen} />}>
      {screen === "home" && <Home go={setScreen} />}
      {screen === "chat" && <Chat />}
      {screen === "todo" && <Todo />}
      {screen === "memo" && <Memo />}
      {screen === "health" && <Health />}
      {screen === "plan" && <Plan />}
      {screen === "settings" && <Settings />}
      <BottomNav active={screen} onChange={setScreen} className="md:hidden" />
    </Shell>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}

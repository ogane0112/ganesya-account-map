import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { Dashboard } from "./pages/Dashboard";
import { AccountList } from "./pages/AccountList";
import { AccountDetail } from "./pages/AccountDetail";
import { AccountForm } from "./pages/AccountForm";
import { RelationGraph } from "./pages/RelationGraph";
import { Settings } from "./pages/Settings";
import { LockScreen } from "./pages/LockScreen";
import { RouterProvider, matchPath, useRouter } from "./lib/router";
import { isUnlocked } from "./lib/lock";

function Routes() {
  const { path } = useRouter();
  const [unlocked, setUnlocked] = useState(isUnlocked());

  useEffect(() => {
    setUnlocked(isUnlocked());
  }, [path]);

  if (!unlocked && path !== "/lock") {
    return <LockScreen />;
  }
  if (path === "/lock") {
    return <LockScreen />;
  }

  if (path === "/") return <Dashboard />;
  if (path === "/accounts") return <AccountList />;
  if (path === "/accounts/new") return <AccountForm />;
  if (path === "/relations") return <RelationGraph />;
  if (path === "/settings") return <Settings />;

  const editMatch = matchPath("/accounts/:id/edit", path);
  if (editMatch) return <AccountForm id={editMatch.id} />;

  const detailMatch = matchPath("/accounts/:id", path);
  if (detailMatch) return <AccountDetail id={detailMatch.id} />;

  return <p>ページが見つかりません</p>;
}

export function App() {
  return (
    <RouterProvider>
      <AppShell />
    </RouterProvider>
  );
}

function AppShell() {
  const { path } = useRouter();
  return (
    <div className="app-shell">
      {path !== "/lock" && <Header />}
      <main className="app-main">
        <Routes />
      </main>
    </div>
  );
}

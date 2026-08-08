import { Link } from "../lib/router";
import { isLockConfigured, lockNow } from "../lib/lock";
import { useRouter } from "../lib/router";

export function Header() {
  const { navigate } = useRouter();

  const handleLock = () => {
    lockNow();
    navigate("/lock");
  };

  return (
    <header className="app-header">
      <div className="app-header-title">アカウント管理マップ</div>
      <nav className="app-nav">
        <Link to="/">ダッシュボード</Link>
        <Link to="/accounts">アカウント一覧</Link>
        <Link to="/relations">紐づけ関係図</Link>
        <Link to="/settings">設定</Link>
      </nav>
      {isLockConfigured() && (
        <button type="button" className="btn btn-secondary" onClick={handleLock}>
          ロック
        </button>
      )}
    </header>
  );
}

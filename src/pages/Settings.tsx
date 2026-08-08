import { useState } from "react";
import { clearLockPassword, isLockConfigured, setLockPassword } from "../lib/lock";
import { exportUrl } from "../lib/api";

export function Settings() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [lockConfigured, setLockConfigured] = useState(isLockConfigured());

  const handleSetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 4) {
      setMessage("マスターパスワードは4文字以上で設定してください");
      return;
    }
    await setLockPassword(password);
    setPassword("");
    setLockConfigured(true);
    setMessage("マスターパスワードを設定しました");
  };

  const handleClearPassword = () => {
    clearLockPassword();
    setLockConfigured(false);
    setMessage("マスターパスワードによるロックを解除しました");
  };

  return (
    <div className="settings">
      <h1>設定</h1>

      <section className="detail-section">
        <h2>マスターパスワード</h2>
        <p className="empty-text">
          {lockConfigured ? "現在ロックが設定されています。" : "現在ロックは設定されていません。"}
        </p>
        <form className="lock-settings-form" onSubmit={handleSetPassword}>
          <label htmlFor="new-password">{lockConfigured ? "新しいパスワードに変更" : "パスワードを設定"}</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            保存
          </button>
        </form>
        {lockConfigured && (
          <button type="button" className="btn btn-danger" onClick={handleClearPassword}>
            ロックを解除する
          </button>
        )}
        {message && <p className="form-message">{message}</p>}
      </section>

      <section className="detail-section">
        <h2>データエクスポート</h2>
        <div className="export-actions">
          <a className="btn btn-secondary" href={exportUrl("json")}>
            JSON形式でエクスポート
          </a>
          <a className="btn btn-secondary" href={exportUrl("csv")}>
            CSV形式でエクスポート
          </a>
        </div>
      </section>
    </div>
  );
}

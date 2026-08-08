import { useState } from "react";
import { tryUnlock } from "../lib/lock";
import { useRouter } from "../lib/router";

export function LockScreen() {
  const { navigate } = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const ok = await tryUnlock(password);
    if (ok) {
      navigate("/");
    } else {
      setError("パスワードが違います");
    }
  };

  return (
    <div className="lock-screen">
      <form className="lock-form" onSubmit={handleSubmit}>
        <h1>ロック中</h1>
        <label htmlFor="master-password">マスターパスワード</label>
        <input
          id="master-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn-primary">
          ロック解除
        </button>
      </form>
    </div>
  );
}

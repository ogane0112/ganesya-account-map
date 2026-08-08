import { useEffect, useState } from "react";
import { fetchAccounts } from "../lib/api";
import type { Account } from "../../shared/types";
import { ACCOUNT_STATUSES, DEFAULT_CATEGORIES } from "../../shared/types";
import { Link } from "../lib/router";
import { StatusBadge } from "../components/StatusBadge";

type ViewMode = "table" | "card";

export function AccountList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("serviceName");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAccounts({ search, category, status, sortBy })
      .then((res) => setAccounts(res.accounts))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, category, status, sortBy]);

  return (
    <div className="account-list">
      <div className="account-list-toolbar">
        <input
          type="search"
          placeholder="サービス名・識別子で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">すべてのカテゴリ</option>
          {DEFAULT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">すべてのステータス</option>
          {ACCOUNT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="serviceName">サービス名順</option>
          <option value="lastLoginAt">最終ログイン日順</option>
          <option value="expiryDate">更新期限順</option>
          <option value="createdAt">登録日順</option>
        </select>
        <div className="view-toggle">
          <button
            type="button"
            className={viewMode === "table" ? "btn btn-active" : "btn"}
            onClick={() => setViewMode("table")}
          >
            テーブル
          </button>
          <button
            type="button"
            className={viewMode === "card" ? "btn btn-active" : "btn"}
            onClick={() => setViewMode("card")}
          >
            カード
          </button>
        </div>
        <Link to="/accounts/new" className="btn btn-primary">
          新規登録
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>読み込み中...</p>}

      {!loading && viewMode === "table" && (
        <table className="account-table">
          <thead>
            <tr>
              <th>サービス名</th>
              <th>カテゴリ</th>
              <th>ステータス</th>
              <th>最終ログイン</th>
              <th>更新期限</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id}>
                <td>
                  <Link to={`/accounts/${account.id}`}>{account.serviceName}</Link>
                </td>
                <td>{account.category}</td>
                <td>
                  <StatusBadge status={account.status} />
                </td>
                <td>{account.lastLoginAt ?? "-"}</td>
                <td>{account.expiryDate ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && viewMode === "card" && (
        <div className="account-cards">
          {accounts.map((account) => (
            <Link to={`/accounts/${account.id}`} key={account.id} className="account-card">
              <div className="account-card-title">{account.serviceName}</div>
              <div className="account-card-meta">{account.category}</div>
              <StatusBadge status={account.status} />
            </Link>
          ))}
        </div>
      )}

      {!loading && accounts.length === 0 && <p className="empty-text">該当するアカウントがありません</p>}
    </div>
  );
}

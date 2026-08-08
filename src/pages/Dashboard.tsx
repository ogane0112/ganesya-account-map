import { useEffect, useState } from "react";
import { fetchDashboard } from "../lib/api";
import type { DashboardSummary } from "../../shared/dashboard";
import { Link } from "../lib/router";
import { StatusBadge } from "../components/StatusBadge";

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard()
      .then(setSummary)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return <p className="form-error">{error}</p>;
  }
  if (!summary) {
    return <p>読み込み中...</p>;
  }

  return (
    <div className="dashboard">
      <section className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-value">{summary.totalCount}</div>
          <div className="summary-card-label">登録アカウント数</div>
        </div>
        {Object.entries(summary.statusCounts).map(([status, count]) => (
          <div className="summary-card" key={status}>
            <div className="summary-card-value">{count}</div>
            <div className="summary-card-label">{status}</div>
          </div>
        ))}
      </section>

      <section className="dashboard-section">
        <h2>休眠アカウント({summary.dormantAccounts.length}件)</h2>
        <AccountMiniList accounts={summary.dormantAccounts} emptyText="休眠中のアカウントはありません" />
      </section>

      <section className="dashboard-section">
        <h2>要確認アカウント({summary.needsReviewAccounts.length}件)</h2>
        <AccountMiniList accounts={summary.needsReviewAccounts} emptyText="要確認のアカウントはありません" />
      </section>

      <section className="dashboard-section">
        <h2>更新期限が近いアカウント({summary.expiringAccounts.length}件)</h2>
        <AccountMiniList accounts={summary.expiringAccounts} emptyText="期限が近いアカウントはありません" />
      </section>
    </div>
  );
}

function AccountMiniList({
  accounts,
  emptyText,
}: {
  accounts: DashboardSummary["dormantAccounts"];
  emptyText: string;
}) {
  if (accounts.length === 0) {
    return <p className="empty-text">{emptyText}</p>;
  }
  return (
    <ul className="mini-list">
      {accounts.map((account) => (
        <li key={account.id}>
          <Link to={`/accounts/${account.id}`}>{account.serviceName}</Link>
          <StatusBadge status={account.status} />
        </li>
      ))}
    </ul>
  );
}

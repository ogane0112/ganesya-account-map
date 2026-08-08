import { useEffect, useState } from "react";
import { deleteAccount, fetchAccountDetail } from "../lib/api";
import type { AccountDetail as AccountDetailData } from "../../shared/types";
import { CREDENTIAL_MANAGER_LABELS } from "../../shared/types";
import { Link, useRouter } from "../lib/router";
import { StatusBadge } from "../components/StatusBadge";

export function AccountDetail({ id }: { id: string }) {
  const { navigate } = useRouter();
  const [detail, setDetail] = useState<AccountDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccountDetail(id)
      .then(setDetail)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) {
    return <p className="form-error">{error}</p>;
  }
  if (!detail) {
    return <p>読み込み中...</p>;
  }

  const { account, loginMethods, parents, children, tags } = detail;

  const handleDelete = async () => {
    if (!window.confirm(`「${account.serviceName}」を削除します。よろしいですか?`)) {
      return;
    }
    await deleteAccount(account.id);
    navigate("/accounts");
  };

  return (
    <div className="account-detail">
      <div className="account-detail-header">
        <h1>{account.serviceName}</h1>
        <StatusBadge status={account.status} />
      </div>

      <div className="account-detail-actions">
        <Link to={`/accounts/${account.id}/edit`} className="btn btn-primary">
          編集
        </Link>
        <Link to="/relations" className="btn btn-secondary">
          関係図で見る
        </Link>
        <button type="button" className="btn btn-danger" onClick={handleDelete}>
          削除
        </button>
      </div>

      <section className="detail-section">
        <h2>基本情報</h2>
        <dl className="detail-fields">
          <dt>識別子</dt>
          <dd>{account.identifier ?? "-"}</dd>
          <dt>カテゴリ</dt>
          <dd>{account.category}</dd>
          <dt>最終ログイン日</dt>
          <dd>{account.lastLoginAt ?? "-"}</dd>
          <dt>更新期限</dt>
          <dd>{account.expiryDate ?? "-"}</dd>
          <dt>メモ</dt>
          <dd>{account.notes ?? "-"}</dd>
          <dt>タグ</dt>
          <dd>{tags.length > 0 ? tags.map((t) => t.name).join(", ") : "-"}</dd>
        </dl>
      </section>

      <section className="detail-section">
        <h2>ログイン方式</h2>
        {loginMethods.length === 0 && <p className="empty-text">ログイン方式が登録されていません</p>}
        <ul className="login-method-list">
          {loginMethods.map((lm) => (
            <li key={lm.id}>
              <strong>{lm.type}</strong>
              {lm.provider && <span> / {lm.provider}</span>}
              {lm.credentialManager && <span> / 保存先: {CREDENTIAL_MANAGER_LABELS[lm.credentialManager]}</span>}
              {lm.maskedCode && <span> / コード: {lm.maskedCode}</span>}
              <span> / 2FA: {lm.has2fa ? "あり" : "なし"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="detail-section">
        <h2>親アカウント(このアカウントが利用している認証元)</h2>
        {parents.length === 0 && <p className="empty-text">なし</p>}
        <ul className="relation-list">
          {parents.map(({ account: parentAccount, relation }) => (
            <li key={relation.id}>
              <Link to={`/accounts/${parentAccount.id}`}>{parentAccount.serviceName}</Link>
              <span> ({relation.relationType})</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="detail-section">
        <h2>子アカウント(このアカウントを認証元として使っているもの)</h2>
        {children.length === 0 && <p className="empty-text">なし</p>}
        <ul className="relation-list">
          {children.map(({ account: childAccount, relation }) => (
            <li key={relation.id}>
              <Link to={`/accounts/${childAccount.id}`}>{childAccount.serviceName}</Link>
              <span> ({relation.relationType})</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

import { useEffect, useState } from "react";
import { createAccount, fetchAccountDetail, updateAccount } from "../lib/api";
import {
  ACCOUNT_STATUSES,
  CREDENTIAL_MANAGERS,
  CREDENTIAL_MANAGER_LABELS,
  DEFAULT_CATEGORIES,
  LOGIN_METHOD_TYPES,
  type AccountStatus,
  type CredentialManager,
  type LoginMethodType,
} from "../../shared/types";
import { useRouter } from "../lib/router";

interface FormLoginMethod {
  type: LoginMethodType;
  provider: string;
  linkedAccountId: string;
  credentialManager: CredentialManager | "";
  has2fa: boolean;
  maskedCode: string;
}

function emptyLoginMethod(): FormLoginMethod {
  return { type: "ID_PW", provider: "", linkedAccountId: "", credentialManager: "", has2fa: false, maskedCode: "" };
}

export function AccountForm({ id }: { id?: string }) {
  const { navigate } = useRouter();
  const isEdit = Boolean(id);

  const [serviceName, setServiceName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0]);
  const [status, setStatus] = useState<AccountStatus>("利用中");
  const [lastLoginAt, setLastLoginAt] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [loginMethods, setLoginMethods] = useState<FormLoginMethod[]>([emptyLoginMethod()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchAccountDetail(id).then((detail) => {
      setServiceName(detail.account.serviceName);
      setIdentifier(detail.account.identifier ?? "");
      setCategory(detail.account.category);
      setStatus(detail.account.status);
      setLastLoginAt(detail.account.lastLoginAt?.slice(0, 10) ?? "");
      setExpiryDate(detail.account.expiryDate?.slice(0, 10) ?? "");
      setNotes(detail.account.notes ?? "");
      setTagsText(detail.tags.map((t) => t.name).join(", "));
      if (detail.loginMethods.length > 0) {
        setLoginMethods(
          detail.loginMethods.map((lm) => ({
            type: lm.type,
            provider: lm.provider ?? "",
            linkedAccountId: lm.linkedAccountId ?? "",
            credentialManager: lm.credentialManager ?? "",
            has2fa: lm.has2fa,
            maskedCode: lm.maskedCode ?? "",
          })),
        );
      }
    });
  }, [id]);

  const updateLoginMethodAt = (index: number, patch: Partial<FormLoginMethod>) => {
    setLoginMethods((prev) => prev.map((lm, i) => (i === index ? { ...lm, ...patch } : lm)));
  };

  const removeLoginMethodAt = (index: number) => {
    setLoginMethods((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const input = {
        serviceName,
        identifier: identifier || null,
        category,
        status,
        lastLoginAt: lastLoginAt || null,
        expiryDate: expiryDate || null,
        notes: notes || null,
        tags: tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        loginMethods: loginMethods.map((lm) => ({
          type: lm.type,
          provider: lm.provider || null,
          linkedAccountId: lm.linkedAccountId || null,
          credentialManager: lm.credentialManager || null,
          has2fa: lm.has2fa,
          maskedCode: lm.maskedCode || null,
        })),
      };
      const detail = isEdit ? await updateAccount(id as string, input) : await createAccount(input);
      navigate(`/accounts/${detail.account.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="account-form" onSubmit={handleSubmit}>
      <h1>{isEdit ? "アカウント編集" : "アカウント新規登録"}</h1>
      {error && <p className="form-error">{error}</p>}

      <label htmlFor="serviceName">サービス名 *</label>
      <input id="serviceName" value={serviceName} onChange={(e) => setServiceName(e.target.value)} required />

      <label htmlFor="identifier">識別子(ID/メールアドレス等)</label>
      <input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />

      <label htmlFor="category">カテゴリ</label>
      <input id="category" list="category-options" value={category} onChange={(e) => setCategory(e.target.value)} />
      <datalist id="category-options">
        {DEFAULT_CATEGORIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <label htmlFor="status">ステータス</label>
      <select id="status" value={status} onChange={(e) => setStatus(e.target.value as AccountStatus)}>
        {ACCOUNT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <label htmlFor="lastLoginAt">最終ログイン日</label>
      <input id="lastLoginAt" type="date" value={lastLoginAt} onChange={(e) => setLastLoginAt(e.target.value)} />

      <label htmlFor="expiryDate">更新期限</label>
      <input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />

      <label htmlFor="notes">メモ</label>
      <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <label htmlFor="tags">タグ(カンマ区切り)</label>
      <input id="tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="PS5, Steam" />

      <h2>ログイン方式</h2>
      {loginMethods.map((lm, index) => (
        <fieldset className="login-method-row" key={index}>
          <label>タイプ</label>
          <select
            value={lm.type}
            onChange={(e) => updateLoginMethodAt(index, { type: e.target.value as LoginMethodType })}
          >
            {LOGIN_METHOD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <label>プロバイダ</label>
          <input
            value={lm.provider}
            onChange={(e) => updateLoginMethodAt(index, { provider: e.target.value })}
            placeholder="Google, LINE, バンダイナムコカード等"
          />

          {lm.type === "ID_PW" && (
            <>
              <label>パスワード保存先 *</label>
              <select
                value={lm.credentialManager}
                onChange={(e) =>
                  updateLoginMethodAt(index, { credentialManager: e.target.value as CredentialManager })
                }
              >
                <option value="">選択してください</option>
                {CREDENTIAL_MANAGERS.map((cm) => (
                  <option key={cm} value={cm}>
                    {CREDENTIAL_MANAGER_LABELS[cm]}
                  </option>
                ))}
              </select>
            </>
          )}

          {lm.type === "Card" && (
            <>
              <label>マスク済みコード(下4桁等)</label>
              <input
                value={lm.maskedCode}
                onChange={(e) => updateLoginMethodAt(index, { maskedCode: e.target.value })}
                placeholder="1234"
                maxLength={4}
              />
            </>
          )}

          {(lm.type === "OAuth" || lm.type === "SNS" || lm.type === "Card") && (
            <>
              <label>連携先アカウントID(任意)</label>
              <input
                value={lm.linkedAccountId}
                onChange={(e) => updateLoginMethodAt(index, { linkedAccountId: e.target.value })}
              />
            </>
          )}

          <label>
            <input
              type="checkbox"
              checked={lm.has2fa}
              onChange={(e) => updateLoginMethodAt(index, { has2fa: e.target.checked })}
            />
            2段階認証あり
          </label>

          <button type="button" className="btn btn-danger" onClick={() => removeLoginMethodAt(index)}>
            この行を削除
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setLoginMethods((prev) => [...prev, emptyLoginMethod()])}
      >
        ログイン方式を追加
      </button>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {isEdit ? "更新する" : "登録する"}
        </button>
      </div>
    </form>
  );
}

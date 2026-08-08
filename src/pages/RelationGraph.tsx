import { useEffect, useMemo, useState } from "react";
import { createRelation, deleteRelation, fetchAccounts, fetchRelations } from "../lib/api";
import type { Account, Relation } from "../../shared/types";
import { getAncestors, getDescendants } from "../../shared/graph";
import { computeGraphLayout } from "../../shared/graphLayout";
import { Link } from "../lib/router";

export function RelationGraph() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [parentId, setParentId] = useState("");
  const [childId, setChildId] = useState("");
  const [relationType, setRelationType] = useState("OAuth連携");

  const reload = () => {
    Promise.all([fetchAccounts({}), fetchRelations()])
      .then(([a, r]) => {
        setAccounts(a.accounts);
        setRelations(r.relations);
      })
      .catch((e: Error) => setError(e.message));
  };

  useEffect(reload, []);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const layout = useMemo(
    () =>
      computeGraphLayout(
        accounts.map((a) => a.id),
        relations,
      ),
    [accounts, relations],
  );

  const ancestors = selectedId ? new Set(getAncestors(relations, selectedId)) : new Set<string>();
  const descendants = selectedId ? new Set(getDescendants(relations, selectedId)) : new Set<string>();

  const handleCreateRelation = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await createRelation({ parentAccountId: parentId, childAccountId: childId, relationType });
      setParentId("");
      setChildId("");
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteRelation(id);
    reload();
  };

  const width = Math.max(600, (Math.max(0, ...layout.nodes.map((n) => n.x)) || 0) + 200);
  const height = Math.max(400, (Math.max(0, ...layout.nodes.map((n) => n.y)) || 0) + 100);

  return (
    <div className="relation-graph">
      <h1>紐づけ関係図</h1>
      {error && <p className="form-error">{error}</p>}

      <svg width={width} height={height} className="graph-svg">
        {layout.edges.map((edge, i) => {
          const from = layout.nodes.find((n) => n.id === edge.from);
          const to = layout.nodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x + 60}
              y1={from.y + 20}
              x2={to.x + 60}
              y2={to.y + 20}
              stroke="#94a3b8"
              strokeWidth={2}
            />
          );
        })}
        {layout.nodes.map((node) => {
          const account = accountsById.get(node.id);
          if (!account) return null;
          const isSelected = node.id === selectedId;
          const isHighlighted = ancestors.has(node.id) || descendants.has(node.id);
          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => setSelectedId(node.id)}
              style={{ cursor: "pointer" }}
            >
              <rect
                width={120}
                height={40}
                rx={8}
                fill={isSelected ? "#2563eb" : isHighlighted ? "#bfdbfe" : "#e2e8f0"}
                stroke="#334155"
              />
              <text x={60} y={24} textAnchor="middle" fontSize={12} fill={isSelected ? "#fff" : "#0f172a"}>
                {account.serviceName}
              </text>
            </g>
          );
        })}
      </svg>

      {selectedId && accountsById.has(selectedId) && (
        <section className="detail-section">
          <h2>{accountsById.get(selectedId)?.serviceName} の影響範囲</h2>
          <p>
            祖先(認証元): {ancestors.size > 0 ? [...ancestors].map((id) => accountsById.get(id)?.serviceName).join(", ") : "なし"}
          </p>
          <p>
            子孫(影響を受けるサービス): {descendants.size > 0 ? [...descendants].map((id) => accountsById.get(id)?.serviceName).join(", ") : "なし"}
          </p>
          <Link to={`/accounts/${selectedId}`}>詳細を見る</Link>
        </section>
      )}

      <section className="detail-section">
        <h2>紐づけ関係を追加</h2>
        <form className="relation-form" onSubmit={handleCreateRelation}>
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} required>
            <option value="">親(認証元)アカウント</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.serviceName}
              </option>
            ))}
          </select>
          <select value={childId} onChange={(e) => setChildId(e.target.value)} required>
            <option value="">子(連携先)アカウント</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.serviceName}
              </option>
            ))}
          </select>
          <input value={relationType} onChange={(e) => setRelationType(e.target.value)} placeholder="関係の種類" />
          <button type="submit" className="btn btn-primary">
            追加
          </button>
        </form>
      </section>

      <section className="detail-section">
        <h2>登録済みの紐づけ関係</h2>
        <ul className="relation-list">
          {relations.map((relation) => (
            <li key={relation.id}>
              {accountsById.get(relation.parentAccountId)?.serviceName ?? relation.parentAccountId}
              {" → "}
              {accountsById.get(relation.childAccountId)?.serviceName ?? relation.childAccountId}
              {` (${relation.relationType})`}
              <button type="button" className="btn btn-danger btn-small" onClick={() => handleDelete(relation.id)}>
                削除
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

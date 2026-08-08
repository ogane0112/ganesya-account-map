import type { RelationEdge } from "./graph";

export interface GraphNodePosition {
  id: string;
  x: number;
  y: number;
  depth: number;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface GraphLayout {
  nodes: GraphNodePosition[];
  edges: GraphEdge[];
}

const X_SPACING = 180;
const Y_SPACING = 120;

/**
 * accounts と relations から、SVG描画用のノード座標を計算する。
 * 外部グラフ描画ライブラリを使わず、幅優先探索でツリー状にレイアウトする。
 * (docs/03_detail_design/process_design.md 2.5 参照)
 */
export function computeGraphLayout(accountIds: string[], relations: RelationEdge[]): GraphLayout {
  const childIds = new Set(relations.map((r) => r.childAccountId));
  const forward = new Map<string, string[]>();
  for (const relation of relations) {
    const children = forward.get(relation.parentAccountId) ?? [];
    children.push(relation.childAccountId);
    forward.set(relation.parentAccountId, children);
  }

  const roots = accountIds.filter((id) => !childIds.has(id));
  const depthById = new Map<string, number>();
  const queue: string[] = [];

  for (const root of roots) {
    depthById.set(root, 0);
    queue.push(root);
  }

  while (queue.length > 0) {
    const current = queue.shift() as string;
    const depth = depthById.get(current) ?? 0;
    const children = forward.get(current) ?? [];
    for (const child of children) {
      if (!depthById.has(child)) {
        depthById.set(child, depth + 1);
        queue.push(child);
      }
    }
  }

  // 循環等でどこからも辿り着けなかったノード(孤立ノード含む)は depth 0 として配置する
  for (const id of accountIds) {
    if (!depthById.has(id)) {
      depthById.set(id, 0);
    }
  }

  const countByDepth = new Map<number, number>();
  const nodes: GraphNodePosition[] = accountIds.map((id) => {
    const depth = depthById.get(id) ?? 0;
    const indexInDepth = countByDepth.get(depth) ?? 0;
    countByDepth.set(depth, indexInDepth + 1);
    return {
      id,
      depth,
      x: indexInDepth * X_SPACING,
      y: depth * Y_SPACING,
    };
  });

  const edges: GraphEdge[] = relations.map((r) => ({ from: r.parentAccountId, to: r.childAccountId }));

  return { nodes, edges };
}

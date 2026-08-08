export interface RelationEdge {
  parentAccountId: string;
  childAccountId: string;
}

function buildForwardAdjacency(relations: RelationEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const relation of relations) {
    const children = adjacency.get(relation.parentAccountId) ?? [];
    children.push(relation.childAccountId);
    adjacency.set(relation.parentAccountId, children);
  }
  return adjacency;
}

function buildBackwardAdjacency(relations: RelationEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const relation of relations) {
    const parents = adjacency.get(relation.childAccountId) ?? [];
    parents.push(relation.parentAccountId);
    adjacency.set(relation.childAccountId, parents);
  }
  return adjacency;
}

function bfsReachable(adjacency: Map<string, string[]>, start: string): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = [start];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    const neighbors = adjacency.get(current) ?? [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}

/**
 * 「このアカウントを失うと、どのサービスに影響するか」の逆引き。
 * accountId を親として辿れる子孫アカウントID一覧(自分自身は含まない)。
 */
export function getDescendants(relations: RelationEdge[], accountId: string): string[] {
  return Array.from(bfsReachable(buildForwardAdjacency(relations), accountId));
}

/**
 * accountId が認証元として利用している祖先アカウントID一覧(自分自身は含まない)。
 */
export function getAncestors(relations: RelationEdge[], accountId: string): string[] {
  return Array.from(bfsReachable(buildBackwardAdjacency(relations), accountId));
}

/**
 * parentAccountId -> childAccountId の関係を新規追加した場合に、
 * 既存の関係と合わせて循環参照が発生するかどうかを判定する。
 */
export function wouldCreateCycle(
  relations: RelationEdge[],
  parentAccountId: string,
  childAccountId: string,
): boolean {
  if (parentAccountId === childAccountId) {
    return true;
  }
  const descendantsOfChild = bfsReachable(buildForwardAdjacency(relations), childAccountId);
  return descendantsOfChild.has(parentAccountId);
}

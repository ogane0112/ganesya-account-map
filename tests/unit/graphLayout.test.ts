import { describe, expect, it } from "vitest";
import { computeGraphLayout } from "../../shared/graphLayout";
import type { RelationEdge } from "../../shared/graph";

describe("computeGraphLayout", () => {
  it("UT-LAYOUT-001: 親のdepthは0、子のdepthは1になる", () => {
    const relations: RelationEdge[] = [{ parentAccountId: "A", childAccountId: "B" }];
    const layout = computeGraphLayout(["A", "B"], relations);
    const nodeA = layout.nodes.find((n) => n.id === "A");
    const nodeB = layout.nodes.find((n) => n.id === "B");
    expect(nodeA?.depth).toBe(0);
    expect(nodeB?.depth).toBe(1);
  });

  it("UT-LAYOUT-002: 関係を持たない孤立ノードもエラーにならずdepth0で配置される", () => {
    const layout = computeGraphLayout(["isolated"], []);
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0].depth).toBe(0);
  });

  it("UT-LAYOUT-003: エッジ数はrelationsの件数と一致する", () => {
    const relations: RelationEdge[] = [
      { parentAccountId: "A", childAccountId: "B" },
      { parentAccountId: "A", childAccountId: "C" },
    ];
    const layout = computeGraphLayout(["A", "B", "C"], relations);
    expect(layout.edges).toHaveLength(2);
  });
});

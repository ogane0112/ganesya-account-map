import { describe, expect, it } from "vitest";
import { getAncestors, getDescendants, wouldCreateCycle, type RelationEdge } from "../../shared/graph";

describe("getDescendants / getAncestors", () => {
  const relations: RelationEdge[] = [
    { parentAccountId: "google", childAccountId: "bandai-namco-id" },
    { parentAccountId: "bandai-namco-id", childAccountId: "game-a" },
  ];

  it("UT-GRAPH-001: googleを失うと影響する子孫を取得できる", () => {
    const descendants = getDescendants(relations, "google");
    expect(descendants).toEqual(expect.arrayContaining(["bandai-namco-id", "game-a"]));
  });

  it("UT-GRAPH-002: game-aの認証元(祖先)を取得できる", () => {
    const ancestors = getAncestors(relations, "game-a");
    expect(ancestors).toEqual(expect.arrayContaining(["bandai-namco-id", "google"]));
  });
});

describe("wouldCreateCycle", () => {
  it("UT-GRAPH-003: 自己ループは循環とみなす", () => {
    expect(wouldCreateCycle([], "acc-1", "acc-1")).toBe(true);
  });

  it("UT-GRAPH-004: 間接的な循環を検出する (A→B→C に C→A を追加)", () => {
    const relations: RelationEdge[] = [
      { parentAccountId: "A", childAccountId: "B" },
      { parentAccountId: "B", childAccountId: "C" },
    ];
    expect(wouldCreateCycle(relations, "C", "A")).toBe(true);
  });

  it("UT-GRAPH-005: 循環しない追加はfalseになる", () => {
    const relations: RelationEdge[] = [{ parentAccountId: "A", childAccountId: "B" }];
    expect(wouldCreateCycle(relations, "A", "C")).toBe(false);
  });
});

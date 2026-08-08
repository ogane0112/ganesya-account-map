import { describe, expect, it } from "vitest";
import { buildDashboardSummary } from "../../shared/dashboard";
import type { Account } from "../../shared/types";

const NOW = "2026-08-08T00:00:00.000Z";

function daysAgoIso(days: number): string {
  return new Date(new Date(NOW).getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function daysFromNowIso(days: number): string {
  return new Date(new Date(NOW).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: overrides.id ?? "acc-1",
    serviceName: "テストサービス",
    identifier: null,
    category: "その他",
    status: "利用中",
    createdAt: NOW,
    updatedAt: NOW,
    lastLoginAt: null,
    expiryDate: null,
    notes: null,
    ...overrides,
  };
}

describe("buildDashboardSummary", () => {
  it("UT-DASH-001: 200日ログインなしのアカウントは休眠扱い", () => {
    const account = makeAccount({ lastLoginAt: daysAgoIso(200) });
    const summary = buildDashboardSummary([account], NOW);
    expect(summary.dormantAccounts.map((a) => a.id)).toContain(account.id);
  });

  it("UT-DASH-002: 解約済みは休眠一覧から除外される", () => {
    const account = makeAccount({ status: "解約済み", lastLoginAt: daysAgoIso(200) });
    const summary = buildDashboardSummary([account], NOW);
    expect(summary.dormantAccounts.map((a) => a.id)).not.toContain(account.id);
  });

  it("UT-DASH-003: lastLoginAtがnullは休眠扱い", () => {
    const account = makeAccount({ lastLoginAt: null });
    const summary = buildDashboardSummary([account], NOW);
    expect(summary.dormantAccounts.map((a) => a.id)).toContain(account.id);
  });

  it("UT-DASH-004: 179日は休眠閾値未満のため対象外", () => {
    const account = makeAccount({ lastLoginAt: daysAgoIso(179) });
    const summary = buildDashboardSummary([account], NOW);
    expect(summary.dormantAccounts.map((a) => a.id)).not.toContain(account.id);
  });

  it("UT-DASH-005: 要確認ステータスはneedsReviewAccountsに含まれる", () => {
    const account = makeAccount({ status: "要確認" });
    const summary = buildDashboardSummary([account], NOW);
    expect(summary.needsReviewAccounts.map((a) => a.id)).toContain(account.id);
  });

  it("UT-DASH-006: 10日後に期限のアカウントはexpiringAccountsに含まれる", () => {
    const account = makeAccount({ expiryDate: daysFromNowIso(10) });
    const summary = buildDashboardSummary([account], NOW);
    expect(summary.expiringAccounts.map((a) => a.id)).toContain(account.id);
  });

  it("UT-DASH-007: 31日後の期限は既定閾値(30日)を超えるため対象外", () => {
    const account = makeAccount({ expiryDate: daysFromNowIso(31) });
    const summary = buildDashboardSummary([account], NOW);
    expect(summary.expiringAccounts.map((a) => a.id)).not.toContain(account.id);
  });

  it("UT-DASH-008: 既に期限切れのアカウントはexpiringAccountsに含まれない", () => {
    const account = makeAccount({ expiryDate: daysAgoIso(1) });
    const summary = buildDashboardSummary([account], NOW);
    expect(summary.expiringAccounts.map((a) => a.id)).not.toContain(account.id);
  });

  it("UT-DASH-009: ステータス別件数と総件数が正しく集計される", () => {
    const accounts = [
      makeAccount({ id: "a", status: "利用中" }),
      makeAccount({ id: "b", status: "休眠" }),
      makeAccount({ id: "c", status: "休眠" }),
      makeAccount({ id: "d", status: "解約済み" }),
    ];
    const summary = buildDashboardSummary(accounts, NOW);
    expect(summary.totalCount).toBe(4);
    expect(summary.statusCounts["休眠"]).toBe(2);
    expect(summary.statusCounts["解約済み"]).toBe(1);
  });
});

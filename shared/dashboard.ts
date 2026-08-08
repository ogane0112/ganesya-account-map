import { ACCOUNT_STATUSES, type Account, type AccountStatus } from "./types";

export interface DashboardThresholds {
  dormantThresholdDays: number;
  expiryThresholdDays: number;
}

export const DEFAULT_DASHBOARD_THRESHOLDS: DashboardThresholds = {
  dormantThresholdDays: 180,
  expiryThresholdDays: 30,
};

export interface DashboardSummary {
  totalCount: number;
  statusCounts: Record<AccountStatus, number>;
  dormantAccounts: Account[];
  needsReviewAccounts: Account[];
  expiringAccounts: Account[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / MS_PER_DAY;
}

function isDormant(account: Account, now: string, thresholdDays: number): boolean {
  if (account.status === "解約済み") {
    return false;
  }
  if (!account.lastLoginAt) {
    return true;
  }
  return daysBetween(account.lastLoginAt, now) >= thresholdDays;
}

function isExpiringSoon(account: Account, now: string, thresholdDays: number): boolean {
  if (!account.expiryDate) {
    return false;
  }
  const daysUntilExpiry = daysBetween(now, account.expiryDate);
  return daysUntilExpiry >= 0 && daysUntilExpiry <= thresholdDays;
}

/**
 * ダッシュボード(SC-01)のサマリー集計。now を引数として受け取る純粋関数とすることで、
 * テスト時に任意の基準日を指定できるようにする。
 */
export function buildDashboardSummary(
  accounts: Account[],
  now: string,
  thresholds: DashboardThresholds = DEFAULT_DASHBOARD_THRESHOLDS,
): DashboardSummary {
  const statusCounts = Object.fromEntries(ACCOUNT_STATUSES.map((s) => [s, 0])) as Record<AccountStatus, number>;
  for (const account of accounts) {
    statusCounts[account.status] += 1;
  }

  return {
    totalCount: accounts.length,
    statusCounts,
    dormantAccounts: accounts.filter((a) => isDormant(a, now, thresholds.dormantThresholdDays)),
    needsReviewAccounts: accounts.filter((a) => a.status === "要確認"),
    expiringAccounts: accounts.filter((a) => isExpiringSoon(a, now, thresholds.expiryThresholdDays)),
  };
}

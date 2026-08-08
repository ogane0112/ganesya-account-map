import { listAllAccounts } from "../lib/db";
import { json, type Env } from "../lib/http";
import { buildDashboardSummary, DEFAULT_DASHBOARD_THRESHOLDS } from "../../shared/dashboard";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const dormantThresholdDays = Number(url.searchParams.get("dormantThresholdDays")) || DEFAULT_DASHBOARD_THRESHOLDS.dormantThresholdDays;
  const expiryThresholdDays = Number(url.searchParams.get("expiryThresholdDays")) || DEFAULT_DASHBOARD_THRESHOLDS.expiryThresholdDays;

  const accounts = await listAllAccounts(env.ACCOUNT_DB);
  const summary = buildDashboardSummary(accounts, new Date().toISOString(), {
    dormantThresholdDays,
    expiryThresholdDays,
  });
  return json(summary);
};

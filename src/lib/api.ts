import type {
  Account,
  AccountDetail,
  AccountInput,
  LoginMethod,
  LoginMethodInput,
  Relation,
  RelationInput,
} from "../../shared/types";
import type { DashboardSummary } from "../../shared/dashboard";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.error?.message ?? `リクエストに失敗しました (${response.status})`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export interface AccountListParams {
  search?: string;
  category?: string;
  status?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export function fetchAccounts(params: AccountListParams = {}): Promise<{ accounts: Account[] }> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return request(`/api/accounts${query ? `?${query}` : ""}`);
}

export function fetchAccountDetail(id: string): Promise<AccountDetail> {
  return request(`/api/accounts/${id}`);
}

export function createAccount(input: AccountInput): Promise<AccountDetail> {
  return request("/api/accounts", { method: "POST", body: JSON.stringify(input) });
}

export function updateAccount(id: string, input: AccountInput): Promise<AccountDetail> {
  return request(`/api/accounts/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteAccount(id: string): Promise<{ ok: true }> {
  return request(`/api/accounts/${id}`, { method: "DELETE" });
}

export function addLoginMethod(accountId: string, input: LoginMethodInput): Promise<LoginMethod> {
  return request(`/api/accounts/${accountId}/login-methods`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateLoginMethod(id: string, input: LoginMethodInput): Promise<LoginMethod> {
  return request(`/api/login-methods/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteLoginMethod(id: string): Promise<{ ok: true }> {
  return request(`/api/login-methods/${id}`, { method: "DELETE" });
}

export function fetchRelations(): Promise<{ relations: Relation[] }> {
  return request("/api/relations");
}

export function createRelation(input: RelationInput): Promise<Relation> {
  return request("/api/relations", { method: "POST", body: JSON.stringify(input) });
}

export function deleteRelation(id: string): Promise<{ ok: true }> {
  return request(`/api/relations/${id}`, { method: "DELETE" });
}

export function fetchDashboard(): Promise<DashboardSummary> {
  return request("/api/dashboard");
}

export function exportUrl(format: "json" | "csv"): string {
  return `/api/export?format=${format}`;
}

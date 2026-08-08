import type { ApiError } from "../../shared/types";

export interface Env {
  ACCOUNT_DB: D1Database;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function errorJson(message: string, status: number, fields?: Record<string, string>): Response {
  const body: ApiError = { error: { message, ...(fields ? { fields } : {}) } };
  return json(body, status);
}

export function notFound(message = "リソースが見つかりません"): Response {
  return errorJson(message, 404);
}

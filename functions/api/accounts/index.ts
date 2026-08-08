import { insertAccount, insertLoginMethod, listAccounts, setAccountTags, upsertTagsByName } from "../../lib/db";
import { buildAccountDetail } from "../../lib/accountDetail";
import { errorJson, json, type Env } from "../../lib/http";
import type { Account, LoginMethod } from "../../../shared/types";
import { validateAccountInput } from "../../../shared/validation";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const sortBy = (url.searchParams.get("sortBy") ?? undefined) as
    | "serviceName"
    | "lastLoginAt"
    | "expiryDate"
    | "createdAt"
    | undefined;
  const sortDir = (url.searchParams.get("sortDir") ?? undefined) as "asc" | "desc" | undefined;

  const accounts = await listAccounts(env.ACCOUNT_DB, { search, category, status, sortBy, sortDir });
  return json({ accounts });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorJson("リクエストボディがJSONとして解釈できません", 400);
  }

  const result = validateAccountInput(body);
  if (!result.valid) {
    return errorJson(result.message, 422, result.fields);
  }

  const now = new Date().toISOString();
  const account: Account = {
    id: crypto.randomUUID(),
    serviceName: result.value.serviceName,
    identifier: result.value.identifier ?? null,
    category: result.value.category ?? "その他",
    status: result.value.status ?? "利用中",
    createdAt: now,
    updatedAt: now,
    lastLoginAt: result.value.lastLoginAt ?? null,
    expiryDate: result.value.expiryDate ?? null,
    notes: result.value.notes ?? null,
  };

  await insertAccount(env.ACCOUNT_DB, account);

  for (const lmInput of result.value.loginMethods ?? []) {
    const loginMethod: LoginMethod = {
      id: crypto.randomUUID(),
      accountId: account.id,
      type: lmInput.type,
      provider: lmInput.provider ?? null,
      linkedAccountId: lmInput.linkedAccountId ?? null,
      credentialManager: lmInput.credentialManager ?? null,
      has2fa: lmInput.has2fa ?? false,
      maskedCode: lmInput.maskedCode ?? null,
      createdAt: now,
    };
    await insertLoginMethod(env.ACCOUNT_DB, loginMethod);
  }

  if (result.value.tags && result.value.tags.length > 0) {
    const tags = await upsertTagsByName(env.ACCOUNT_DB, result.value.tags);
    await setAccountTags(
      env.ACCOUNT_DB,
      account.id,
      tags.map((t) => t.id),
    );
  }

  const detail = await buildAccountDetail(env.ACCOUNT_DB, account);
  return json(detail, 201);
};

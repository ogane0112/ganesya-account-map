import { deleteAccount, getAccountById, setAccountTags, updateAccount, upsertTagsByName } from "../../lib/db";
import { buildAccountDetail } from "../../lib/accountDetail";
import { errorJson, json, notFound, type Env } from "../../lib/http";
import { validateAccountInput } from "../../../shared/validation";

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id as string;
  const account = await getAccountById(env.ACCOUNT_DB, id);
  if (!account) {
    return notFound("アカウントが見つかりません");
  }
  const detail = await buildAccountDetail(env.ACCOUNT_DB, account);
  return json(detail);
};

export const onRequestPut: PagesFunction<Env> = async ({ request, params, env }) => {
  const id = params.id as string;
  const existing = await getAccountById(env.ACCOUNT_DB, id);
  if (!existing) {
    return notFound("アカウントが見つかりません");
  }

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

  const updated = {
    ...existing,
    serviceName: result.value.serviceName,
    identifier: result.value.identifier ?? null,
    category: result.value.category ?? existing.category,
    status: result.value.status ?? existing.status,
    lastLoginAt: result.value.lastLoginAt ?? null,
    expiryDate: result.value.expiryDate ?? null,
    notes: result.value.notes ?? null,
    updatedAt: new Date().toISOString(),
  };

  await updateAccount(env.ACCOUNT_DB, updated);

  if (result.value.tags) {
    const tags = await upsertTagsByName(env.ACCOUNT_DB, result.value.tags);
    await setAccountTags(
      env.ACCOUNT_DB,
      updated.id,
      tags.map((t) => t.id),
    );
  }

  const detail = await buildAccountDetail(env.ACCOUNT_DB, updated);
  return json(detail);
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id as string;
  const existing = await getAccountById(env.ACCOUNT_DB, id);
  if (!existing) {
    return notFound("アカウントが見つかりません");
  }
  await deleteAccount(env.ACCOUNT_DB, id);
  return json({ ok: true });
};

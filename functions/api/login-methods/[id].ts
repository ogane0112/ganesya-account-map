import { deleteLoginMethod, getLoginMethodById, updateLoginMethod } from "../../lib/db";
import { errorJson, json, notFound, type Env } from "../../lib/http";
import { validateLoginMethodInput } from "../../../shared/validation";

export const onRequestPut: PagesFunction<Env> = async ({ request, params, env }) => {
  const id = params.id as string;
  const existing = await getLoginMethodById(env.ACCOUNT_DB, id);
  if (!existing) {
    return notFound("ログイン方式が見つかりません");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorJson("リクエストボディがJSONとして解釈できません", 400);
  }

  const result = validateLoginMethodInput(body, 0);
  if (!result.valid) {
    return errorJson(result.message, 422, result.fields);
  }

  const updated = {
    ...existing,
    type: result.value.type,
    provider: result.value.provider ?? null,
    linkedAccountId: result.value.linkedAccountId ?? null,
    credentialManager: result.value.credentialManager ?? null,
    has2fa: result.value.has2fa ?? false,
    maskedCode: result.value.maskedCode ?? null,
  };

  await updateLoginMethod(env.ACCOUNT_DB, updated);
  return json(updated);
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id as string;
  const existing = await getLoginMethodById(env.ACCOUNT_DB, id);
  if (!existing) {
    return notFound("ログイン方式が見つかりません");
  }
  await deleteLoginMethod(env.ACCOUNT_DB, id);
  return json({ ok: true });
};

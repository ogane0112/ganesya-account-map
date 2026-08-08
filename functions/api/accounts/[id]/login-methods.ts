import { getAccountById, insertLoginMethod } from "../../../lib/db";
import { errorJson, json, notFound, type Env } from "../../../lib/http";
import { validateLoginMethodInput } from "../../../../shared/validation";
import type { LoginMethod } from "../../../../shared/types";

export const onRequestPost: PagesFunction<Env> = async ({ request, params, env }) => {
  const accountId = params.id as string;
  const account = await getAccountById(env.ACCOUNT_DB, accountId);
  if (!account) {
    return notFound("アカウントが見つかりません");
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

  const loginMethod: LoginMethod = {
    id: crypto.randomUUID(),
    accountId,
    type: result.value.type,
    provider: result.value.provider ?? null,
    linkedAccountId: result.value.linkedAccountId ?? null,
    credentialManager: result.value.credentialManager ?? null,
    has2fa: result.value.has2fa ?? false,
    maskedCode: result.value.maskedCode ?? null,
    createdAt: new Date().toISOString(),
  };

  await insertLoginMethod(env.ACCOUNT_DB, loginMethod);
  return json(loginMethod, 201);
};

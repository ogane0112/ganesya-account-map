import { getAccountById, insertRelation, listRelations } from "../../lib/db";
import { errorJson, json, type Env } from "../../lib/http";
import { validateRelationInput } from "../../../shared/validation";
import { wouldCreateCycle } from "../../../shared/graph";
import type { Relation } from "../../../shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const relations = await listRelations(env.ACCOUNT_DB);
  return json({ relations });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorJson("リクエストボディがJSONとして解釈できません", 400);
  }

  const result = validateRelationInput(body);
  if (!result.valid) {
    return errorJson(result.message, 422, result.fields);
  }

  const [parent, child] = await Promise.all([
    getAccountById(env.ACCOUNT_DB, result.value.parentAccountId),
    getAccountById(env.ACCOUNT_DB, result.value.childAccountId),
  ]);
  if (!parent || !child) {
    return errorJson("親または子に指定されたアカウントが見つかりません", 422);
  }

  const existingRelations = await listRelations(env.ACCOUNT_DB);
  if (wouldCreateCycle(existingRelations, result.value.parentAccountId, result.value.childAccountId)) {
    return errorJson("循環した紐づけは登録できません", 422, {
      childAccountId: "この関係を追加すると循環参照が発生します",
    });
  }

  const duplicate = existingRelations.some(
    (r) =>
      r.parentAccountId === result.value.parentAccountId &&
      r.childAccountId === result.value.childAccountId &&
      r.relationType === result.value.relationType,
  );
  if (duplicate) {
    return errorJson("同じ紐づけ関係が既に登録されています", 422);
  }

  const relation: Relation = {
    id: crypto.randomUUID(),
    parentAccountId: result.value.parentAccountId,
    childAccountId: result.value.childAccountId,
    relationType: result.value.relationType,
    note: result.value.note ?? null,
    createdAt: new Date().toISOString(),
  };

  await insertRelation(env.ACCOUNT_DB, relation);
  return json(relation, 201);
};

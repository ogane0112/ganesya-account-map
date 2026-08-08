import { deleteRelation, getRelationById } from "../../lib/db";
import { json, notFound, type Env } from "../../lib/http";

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id as string;
  const existing = await getRelationById(env.ACCOUNT_DB, id);
  if (!existing) {
    return notFound("紐づけ関係が見つかりません");
  }
  await deleteRelation(env.ACCOUNT_DB, id);
  return json({ ok: true });
};

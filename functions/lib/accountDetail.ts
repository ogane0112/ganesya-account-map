import { getAccountById, listLoginMethodsByAccountId, listRelationsByAccount, listTagsForAccount } from "./db";
import type { Account, AccountDetail } from "../../shared/types";

export async function buildAccountDetail(db: D1Database, account: Account): Promise<AccountDetail> {
  const [loginMethods, relations, tags] = await Promise.all([
    listLoginMethodsByAccountId(db, account.id),
    listRelationsByAccount(db, account.id),
    listTagsForAccount(db, account.id),
  ]);

  const parents = await Promise.all(
    relations.asChild.map(async (relation) => ({
      relation,
      account: (await getAccountById(db, relation.parentAccountId)) as Account,
    })),
  );
  const children = await Promise.all(
    relations.asParent.map(async (relation) => ({
      relation,
      account: (await getAccountById(db, relation.childAccountId)) as Account,
    })),
  );

  return { account, loginMethods, parents, children, tags };
}

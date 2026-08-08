import type { Account, LoginMethod, Relation, Tag } from "../../shared/types";

type AccountRow = {
  id: string;
  service_name: string;
  identifier: string | null;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  expiry_date: string | null;
  notes: string | null;
};

type LoginMethodRow = {
  id: string;
  account_id: string;
  type: string;
  provider: string | null;
  linked_account_id: string | null;
  credential_manager: string | null;
  has_2fa: number;
  masked_code: string | null;
  created_at: string;
};

type RelationRow = {
  id: string;
  parent_account_id: string;
  child_account_id: string;
  relation_type: string;
  note: string | null;
  created_at: string;
};

type TagRow = { id: string; name: string };

function rowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    serviceName: row.service_name,
    identifier: row.identifier,
    category: row.category,
    status: row.status as Account["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    expiryDate: row.expiry_date,
    notes: row.notes,
  };
}

function rowToLoginMethod(row: LoginMethodRow): LoginMethod {
  return {
    id: row.id,
    accountId: row.account_id,
    type: row.type as LoginMethod["type"],
    provider: row.provider,
    linkedAccountId: row.linked_account_id,
    credentialManager: row.credential_manager as LoginMethod["credentialManager"],
    has2fa: row.has_2fa === 1,
    maskedCode: row.masked_code,
    createdAt: row.created_at,
  };
}

function rowToRelation(row: RelationRow): Relation {
  return {
    id: row.id,
    parentAccountId: row.parent_account_id,
    childAccountId: row.child_account_id,
    relationType: row.relation_type,
    note: row.note,
    createdAt: row.created_at,
  };
}

function rowToTag(row: TagRow): Tag {
  return { id: row.id, name: row.name };
}

export interface AccountListQuery {
  search?: string;
  category?: string;
  status?: string;
  sortBy?: "serviceName" | "lastLoginAt" | "expiryDate" | "createdAt";
  sortDir?: "asc" | "desc";
}

const SORT_COLUMN: Record<NonNullable<AccountListQuery["sortBy"]>, string> = {
  serviceName: "service_name",
  lastLoginAt: "last_login_at",
  expiryDate: "expiry_date",
  createdAt: "created_at",
};

export async function listAccounts(db: D1Database, query: AccountListQuery): Promise<Account[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query.search) {
    conditions.push("(service_name LIKE ? OR identifier LIKE ?)");
    params.push(`%${query.search}%`, `%${query.search}%`);
  }
  if (query.category) {
    conditions.push("category = ?");
    params.push(query.category);
  }
  if (query.status) {
    conditions.push("status = ?");
    params.push(query.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sortColumn = SORT_COLUMN[query.sortBy ?? "serviceName"];
  const sortDir = query.sortDir === "desc" ? "DESC" : "ASC";

  const stmt = db
    .prepare(`SELECT * FROM accounts ${where} ORDER BY ${sortColumn} ${sortDir}`)
    .bind(...params);
  const { results } = await stmt.all<AccountRow>();
  return results.map(rowToAccount);
}

export async function getAccountById(db: D1Database, id: string): Promise<Account | null> {
  const row = await db.prepare("SELECT * FROM accounts WHERE id = ?").bind(id).first<AccountRow>();
  return row ? rowToAccount(row) : null;
}

export async function insertAccount(db: D1Database, account: Account): Promise<void> {
  await db
    .prepare(
      `INSERT INTO accounts
        (id, service_name, identifier, category, status, created_at, updated_at, last_login_at, expiry_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      account.id,
      account.serviceName,
      account.identifier,
      account.category,
      account.status,
      account.createdAt,
      account.updatedAt,
      account.lastLoginAt,
      account.expiryDate,
      account.notes,
    )
    .run();
}

export async function updateAccount(db: D1Database, account: Account): Promise<void> {
  await db
    .prepare(
      `UPDATE accounts SET
        service_name = ?, identifier = ?, category = ?, status = ?,
        updated_at = ?, last_login_at = ?, expiry_date = ?, notes = ?
       WHERE id = ?`,
    )
    .bind(
      account.serviceName,
      account.identifier,
      account.category,
      account.status,
      account.updatedAt,
      account.lastLoginAt,
      account.expiryDate,
      account.notes,
      account.id,
    )
    .run();
}

export async function deleteAccount(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM accounts WHERE id = ?").bind(id).run();
}

export async function listLoginMethodsByAccountId(db: D1Database, accountId: string): Promise<LoginMethod[]> {
  const { results } = await db
    .prepare("SELECT * FROM login_methods WHERE account_id = ? ORDER BY created_at ASC")
    .bind(accountId)
    .all<LoginMethodRow>();
  return results.map(rowToLoginMethod);
}

export async function insertLoginMethod(db: D1Database, loginMethod: LoginMethod): Promise<void> {
  await db
    .prepare(
      `INSERT INTO login_methods
        (id, account_id, type, provider, linked_account_id, credential_manager, has_2fa, masked_code, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      loginMethod.id,
      loginMethod.accountId,
      loginMethod.type,
      loginMethod.provider,
      loginMethod.linkedAccountId,
      loginMethod.credentialManager,
      loginMethod.has2fa ? 1 : 0,
      loginMethod.maskedCode,
      loginMethod.createdAt,
    )
    .run();
}

export async function updateLoginMethod(db: D1Database, loginMethod: LoginMethod): Promise<void> {
  await db
    .prepare(
      `UPDATE login_methods SET
        type = ?, provider = ?, linked_account_id = ?, credential_manager = ?, has_2fa = ?, masked_code = ?
       WHERE id = ?`,
    )
    .bind(
      loginMethod.type,
      loginMethod.provider,
      loginMethod.linkedAccountId,
      loginMethod.credentialManager,
      loginMethod.has2fa ? 1 : 0,
      loginMethod.maskedCode,
      loginMethod.id,
    )
    .run();
}

export async function deleteLoginMethod(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM login_methods WHERE id = ?").bind(id).run();
}

export async function getLoginMethodById(db: D1Database, id: string): Promise<LoginMethod | null> {
  const row = await db.prepare("SELECT * FROM login_methods WHERE id = ?").bind(id).first<LoginMethodRow>();
  return row ? rowToLoginMethod(row) : null;
}

export async function listAllLoginMethods(db: D1Database): Promise<LoginMethod[]> {
  const { results } = await db.prepare("SELECT * FROM login_methods").all<LoginMethodRow>();
  return results.map(rowToLoginMethod);
}

export async function listRelations(db: D1Database): Promise<Relation[]> {
  const { results } = await db.prepare("SELECT * FROM relations").all<RelationRow>();
  return results.map(rowToRelation);
}

export async function listRelationsByAccount(db: D1Database, accountId: string) {
  const [asParent, asChild] = await Promise.all([
    db.prepare("SELECT * FROM relations WHERE parent_account_id = ?").bind(accountId).all<RelationRow>(),
    db.prepare("SELECT * FROM relations WHERE child_account_id = ?").bind(accountId).all<RelationRow>(),
  ]);
  return {
    asParent: asParent.results.map(rowToRelation),
    asChild: asChild.results.map(rowToRelation),
  };
}

export async function insertRelation(db: D1Database, relation: Relation): Promise<void> {
  await db
    .prepare(
      `INSERT INTO relations (id, parent_account_id, child_account_id, relation_type, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      relation.id,
      relation.parentAccountId,
      relation.childAccountId,
      relation.relationType,
      relation.note,
      relation.createdAt,
    )
    .run();
}

export async function deleteRelation(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM relations WHERE id = ?").bind(id).run();
}

export async function getRelationById(db: D1Database, id: string): Promise<Relation | null> {
  const row = await db.prepare("SELECT * FROM relations WHERE id = ?").bind(id).first<RelationRow>();
  return row ? rowToRelation(row) : null;
}

export async function listTagsForAccount(db: D1Database, accountId: string): Promise<Tag[]> {
  const { results } = await db
    .prepare(
      `SELECT tags.id as id, tags.name as name FROM tags
       INNER JOIN account_tags ON account_tags.tag_id = tags.id
       WHERE account_tags.account_id = ?`,
    )
    .bind(accountId)
    .all<TagRow>();
  return results.map(rowToTag);
}

export async function listAllTags(db: D1Database): Promise<Tag[]> {
  const { results } = await db.prepare("SELECT * FROM tags").all<TagRow>();
  return results.map(rowToTag);
}

export async function listAllAccountTags(db: D1Database): Promise<{ accountId: string; tagId: string }[]> {
  const { results } = await db
    .prepare("SELECT account_id as accountId, tag_id as tagId FROM account_tags")
    .all<{ accountId: string; tagId: string }>();
  return results;
}

/** タグ名の配列を受け取り、未登録のものはINSERTしたうえで全タグのTag[]を返す */
export async function upsertTagsByName(db: D1Database, names: string[]): Promise<Tag[]> {
  const tags: Tag[] = [];
  for (const name of names) {
    const existing = await db.prepare("SELECT * FROM tags WHERE name = ?").bind(name).first<TagRow>();
    if (existing) {
      tags.push(rowToTag(existing));
      continue;
    }
    const id = crypto.randomUUID();
    await db.prepare("INSERT INTO tags (id, name) VALUES (?, ?)").bind(id, name).run();
    tags.push({ id, name });
  }
  return tags;
}

export async function setAccountTags(db: D1Database, accountId: string, tagIds: string[]): Promise<void> {
  await db.prepare("DELETE FROM account_tags WHERE account_id = ?").bind(accountId).run();
  for (const tagId of tagIds) {
    await db
      .prepare("INSERT INTO account_tags (account_id, tag_id) VALUES (?, ?)")
      .bind(accountId, tagId)
      .run();
  }
}

export async function listAllAccounts(db: D1Database): Promise<Account[]> {
  const { results } = await db.prepare("SELECT * FROM accounts").all<AccountRow>();
  return results.map(rowToAccount);
}

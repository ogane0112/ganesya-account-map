import type { Account, LoginMethod, Relation, Tag } from "./types";

export interface ExportBundle {
  accounts: Account[];
  loginMethods: LoginMethod[];
  relations: Relation[];
  tags: Tag[];
  accountTags: { accountId: string; tagId: string }[];
  exportedAt: string;
}

export function toExportJson(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const CSV_HEADERS = [
  "id",
  "serviceName",
  "identifier",
  "category",
  "status",
  "lastLoginAt",
  "expiryDate",
  "notes",
  "loginMethods",
];

export function toExportCsv(accounts: Account[], loginMethods: LoginMethod[]): string {
  const loginMethodsByAccountId = new Map<string, LoginMethod[]>();
  for (const lm of loginMethods) {
    const list = loginMethodsByAccountId.get(lm.accountId) ?? [];
    list.push(lm);
    loginMethodsByAccountId.set(lm.accountId, list);
  }

  const rows = accounts.map((account) => {
    const methods = loginMethodsByAccountId.get(account.id) ?? [];
    const methodsSummary = methods
      .map((m) => `${m.type}${m.provider ? `:${m.provider}` : ""}`)
      .join(";");
    return [
      account.id,
      account.serviceName,
      account.identifier ?? "",
      account.category,
      account.status,
      account.lastLoginAt ?? "",
      account.expiryDate ?? "",
      account.notes ?? "",
      methodsSummary,
    ]
      .map((v) => csvEscape(String(v)))
      .join(",");
  });

  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

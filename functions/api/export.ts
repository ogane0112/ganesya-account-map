import { listAllAccountTags, listAllAccounts, listAllLoginMethods, listAllTags, listRelations } from "../lib/db";
import { errorJson, type Env } from "../lib/http";
import { toExportCsv, toExportJson } from "../../shared/export";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";

  const [accounts, loginMethods, relations, tags, accountTags] = await Promise.all([
    listAllAccounts(env.ACCOUNT_DB),
    listAllLoginMethods(env.ACCOUNT_DB),
    listRelations(env.ACCOUNT_DB),
    listAllTags(env.ACCOUNT_DB),
    listAllAccountTags(env.ACCOUNT_DB),
  ]);

  if (format === "csv") {
    const csv = toExportCsv(accounts, loginMethods);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="accounts-export-${Date.now()}.csv"`,
      },
    });
  }

  if (format !== "json") {
    return errorJson("format は json または csv を指定してください", 400);
  }

  const jsonBody = toExportJson({
    accounts,
    loginMethods,
    relations,
    tags,
    accountTags,
    exportedAt: new Date().toISOString(),
  });
  return new Response(jsonBody, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="accounts-export-${Date.now()}.json"`,
    },
  });
};

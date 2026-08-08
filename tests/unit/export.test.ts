import { describe, expect, it } from "vitest";
import { toExportCsv, toExportJson } from "../../shared/export";
import type { Account, LoginMethod } from "../../shared/types";

const NOW = "2026-08-08T00:00:00.000Z";

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: "acc-1",
    serviceName: "Steam",
    identifier: null,
    category: "ゲーム",
    status: "利用中",
    createdAt: NOW,
    updatedAt: NOW,
    lastLoginAt: null,
    expiryDate: null,
    notes: null,
    ...overrides,
  };
}

describe("toExportJson", () => {
  it("UT-EXPORT-001: JSON文字列をパースすると元のデータが復元できる", () => {
    const account = makeAccount({});
    const json = toExportJson({
      accounts: [account],
      loginMethods: [],
      relations: [],
      tags: [],
      accountTags: [],
      exportedAt: NOW,
    });
    const parsed = JSON.parse(json);
    expect(parsed.accounts).toHaveLength(1);
    expect(parsed.accounts[0].id).toBe("acc-1");
  });
});

describe("toExportCsv", () => {
  it("UT-EXPORT-002: アカウントが0件の場合はヘッダー行のみ出力される", () => {
    const csv = toExportCsv([], []);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("serviceName");
  });

  it("UT-EXPORT-003: カンマを含むnotesはダブルクォートでエスケープされる", () => {
    const account = makeAccount({ notes: "備考,補足" });
    const csv = toExportCsv([account], []);
    expect(csv).toContain('"備考,補足"');
  });

  it("UT-EXPORT-004: 複数のログイン方式がセミコロン区切りで要約される", () => {
    const account = makeAccount({});
    const loginMethods: LoginMethod[] = [
      {
        id: "lm-1",
        accountId: "acc-1",
        type: "ID_PW",
        provider: "Steam",
        linkedAccountId: null,
        credentialManager: "ONEPASSWORD",
        has2fa: true,
        maskedCode: null,
        createdAt: NOW,
      },
      {
        id: "lm-2",
        accountId: "acc-1",
        type: "OAuth",
        provider: "Google",
        linkedAccountId: null,
        credentialManager: null,
        has2fa: false,
        maskedCode: null,
        createdAt: NOW,
      },
    ];
    const csv = toExportCsv([account], loginMethods);
    expect(csv).toContain("ID_PW:Steam;OAuth:Google");
  });
});

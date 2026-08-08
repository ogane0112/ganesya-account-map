import { describe, expect, it } from "vitest";
import { validateAccountInput, validateRelationInput } from "../../shared/validation";

describe("validateAccountInput", () => {
  it("UT-VAL-001: serviceNameのみでも既定値が補完され有効になる", () => {
    const result = validateAccountInput({ serviceName: "Steam" });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.value.status).toBe("利用中");
      expect(result.value.category).toBe("その他");
    }
  });

  it("UT-VAL-002: serviceName未指定はエラーになる", () => {
    const result = validateAccountInput({});
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.fields.serviceName).toBeDefined();
    }
  });

  it("UT-VAL-003: serviceNameが101文字はエラーになる", () => {
    const result = validateAccountInput({ serviceName: "a".repeat(101) });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.fields.serviceName).toBeDefined();
    }
  });

  it("UT-VAL-004: statusが不正な値はエラーになる", () => {
    const result = validateAccountInput({ serviceName: "Steam", status: "不明" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.fields.status).toBeDefined();
    }
  });

  it("UT-VAL-005: ID_PW方式でcredentialManager指定ありは有効", () => {
    const result = validateAccountInput({
      serviceName: "Steam",
      loginMethods: [{ type: "ID_PW", credentialManager: "GOOGLE_PASSWORD_MANAGER" }],
    });
    expect(result.valid).toBe(true);
  });

  it("UT-VAL-006: ID_PW方式でcredentialManager未指定はエラー(5.4関連)", () => {
    const result = validateAccountInput({
      serviceName: "Steam",
      loginMethods: [{ type: "ID_PW" }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.fields["loginMethods[0].credentialManager"]).toBeDefined();
    }
  });

  it("UT-VAL-007: Card方式でmaskedCodeが5桁はエラー", () => {
    const result = validateAccountInput({
      serviceName: "ゲームA",
      loginMethods: [{ type: "Card", maskedCode: "12345" }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.fields["loginMethods[0].maskedCode"]).toBeDefined();
    }
  });

  it("UT-VAL-008: Card方式でmaskedCodeが4桁は有効", () => {
    const result = validateAccountInput({
      serviceName: "ゲームA",
      loginMethods: [{ type: "Card", maskedCode: "1234" }],
    });
    expect(result.valid).toBe(true);
  });

  it("UT-VAL-009: tagsは空白トリム・空文字除外される", () => {
    const result = validateAccountInput({ serviceName: "Steam", tags: [" PS5 ", "", "  "] });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.value.tags).toEqual(["PS5"]);
    }
  });
});

describe("validateRelationInput", () => {
  it("UT-VAL-010: parentとchildが同一IDはエラー", () => {
    const result = validateRelationInput({
      parentAccountId: "acc-1",
      childAccountId: "acc-1",
      relationType: "OAuth連携",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.fields.childAccountId).toBeDefined();
    }
  });

  it("UT-VAL-011: 正しい入力は有効", () => {
    const result = validateRelationInput({
      parentAccountId: "acc-1",
      childAccountId: "acc-2",
      relationType: "OAuth連携",
    });
    expect(result.valid).toBe(true);
  });
});

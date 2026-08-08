import {
  ACCOUNT_STATUSES,
  CREDENTIAL_MANAGERS,
  LOGIN_METHOD_TYPES,
  type AccountInput,
  type AccountStatus,
  type CredentialManager,
  type LoginMethodInput,
  type LoginMethodType,
  type RelationInput,
} from "./types";

export interface FieldErrors {
  [field: string]: string;
}

export type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; message: string; fields: FieldErrors };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAccountStatus(value: unknown): value is AccountStatus {
  return typeof value === "string" && (ACCOUNT_STATUSES as readonly string[]).includes(value);
}

function isLoginMethodType(value: unknown): value is LoginMethodType {
  return typeof value === "string" && (LOGIN_METHOD_TYPES as readonly string[]).includes(value);
}

function isCredentialManager(value: unknown): value is CredentialManager {
  return typeof value === "string" && (CREDENTIAL_MANAGERS as readonly string[]).includes(value);
}

const MASKED_CODE_PATTERN = /^[0-9*]{1,4}$/;

export function validateLoginMethodInput(
  input: unknown,
  index: number,
): ValidationResult<LoginMethodInput> {
  const fields: FieldErrors = {};
  const prefix = `loginMethods[${index}]`;

  if (!isRecord(input)) {
    return { valid: false, message: "ログイン方式の形式が不正です", fields: { [prefix]: "オブジェクトである必要があります" } };
  }

  if (!isLoginMethodType(input.type)) {
    fields[`${prefix}.type`] = `type は ${LOGIN_METHOD_TYPES.join(" / ")} のいずれかである必要があります`;
  }

  if (input.credentialManager !== undefined && input.credentialManager !== null && !isCredentialManager(input.credentialManager)) {
    fields[`${prefix}.credentialManager`] = "不正なパスワード保存先です";
  }

  if (isLoginMethodType(input.type) && input.type === "ID_PW") {
    if (!isCredentialManager(input.credentialManager)) {
      fields[`${prefix}.credentialManager`] = "ID/パスワード方式の場合、パスワード保存先の選択は必須です";
    }
  }

  if (isLoginMethodType(input.type) && input.type === "Card") {
    if (input.maskedCode !== undefined && input.maskedCode !== null) {
      if (typeof input.maskedCode !== "string" || !MASKED_CODE_PATTERN.test(input.maskedCode)) {
        fields[`${prefix}.maskedCode`] = "マスク済みコードは数字またはアスタリスクの4文字以内で入力してください";
      }
    }
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, message: "ログイン方式の入力内容に誤りがあります", fields };
  }

  return {
    valid: true,
    value: {
      type: input.type as LoginMethodType,
      provider: typeof input.provider === "string" ? input.provider : null,
      linkedAccountId: typeof input.linkedAccountId === "string" ? input.linkedAccountId : null,
      credentialManager: isCredentialManager(input.credentialManager) ? input.credentialManager : null,
      has2fa: input.has2fa === true,
      maskedCode: typeof input.maskedCode === "string" ? input.maskedCode : null,
    },
  };
}

export function validateAccountInput(input: unknown): ValidationResult<AccountInput> {
  const fields: FieldErrors = {};

  if (!isRecord(input)) {
    return { valid: false, message: "リクエストボディの形式が不正です", fields: { body: "オブジェクトである必要があります" } };
  }

  if (!isNonEmptyString(input.serviceName) || input.serviceName.length > 100) {
    fields.serviceName = "サービス名は1〜100文字で必須です";
  }

  if (input.category !== undefined && (typeof input.category !== "string" || input.category.length > 40)) {
    fields.category = "カテゴリは40文字以内で入力してください";
  }

  if (input.status !== undefined && !isAccountStatus(input.status)) {
    fields.status = `status は ${ACCOUNT_STATUSES.join(" / ")} のいずれかである必要があります`;
  }

  const loginMethods: LoginMethodInput[] = [];
  if (input.loginMethods !== undefined) {
    if (!Array.isArray(input.loginMethods)) {
      fields.loginMethods = "loginMethods は配列である必要があります";
    } else {
      input.loginMethods.forEach((lm, index) => {
        const result = validateLoginMethodInput(lm, index);
        if (!result.valid) {
          Object.assign(fields, result.fields);
        } else {
          loginMethods.push(result.value);
        }
      });
    }
  }

  const tags: string[] = [];
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags) || input.tags.some((t) => typeof t !== "string")) {
      fields.tags = "tags は文字列の配列である必要があります";
    } else {
      tags.push(...(input.tags as string[]).map((t) => t.trim()).filter((t) => t.length > 0));
    }
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, message: "入力内容に誤りがあります", fields };
  }

  return {
    valid: true,
    value: {
      serviceName: (input.serviceName as string).trim(),
      identifier: typeof input.identifier === "string" ? input.identifier : null,
      category: typeof input.category === "string" && input.category.length > 0 ? input.category : "その他",
      status: isAccountStatus(input.status) ? input.status : "利用中",
      lastLoginAt: typeof input.lastLoginAt === "string" ? input.lastLoginAt : null,
      expiryDate: typeof input.expiryDate === "string" ? input.expiryDate : null,
      notes: typeof input.notes === "string" ? input.notes : null,
      tags,
      loginMethods,
    },
  };
}

export function validateRelationInput(input: unknown): ValidationResult<RelationInput> {
  const fields: FieldErrors = {};

  if (!isRecord(input)) {
    return { valid: false, message: "リクエストボディの形式が不正です", fields: { body: "オブジェクトである必要があります" } };
  }

  if (!isNonEmptyString(input.parentAccountId)) {
    fields.parentAccountId = "parentAccountId は必須です";
  }
  if (!isNonEmptyString(input.childAccountId)) {
    fields.childAccountId = "childAccountId は必須です";
  }
  if (!isNonEmptyString(input.relationType)) {
    fields.relationType = "relationType は必須です";
  }
  if (
    isNonEmptyString(input.parentAccountId) &&
    isNonEmptyString(input.childAccountId) &&
    input.parentAccountId === input.childAccountId
  ) {
    fields.childAccountId = "親アカウントと子アカウントに同じアカウントは指定できません";
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, message: "入力内容に誤りがあります", fields };
  }

  return {
    valid: true,
    value: {
      parentAccountId: input.parentAccountId as string,
      childAccountId: input.childAccountId as string,
      relationType: input.relationType as string,
      note: typeof input.note === "string" ? input.note : null,
    },
  };
}

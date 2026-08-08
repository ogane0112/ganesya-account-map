export const ACCOUNT_STATUSES = ["利用中", "休眠", "解約済み", "要確認"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const LOGIN_METHOD_TYPES = ["ID_PW", "OAuth", "SNS", "Card", "Device"] as const;
export type LoginMethodType = (typeof LOGIN_METHOD_TYPES)[number];

export const CREDENTIAL_MANAGERS = [
  "GOOGLE_PASSWORD_MANAGER",
  "MS_EDGE",
  "APPLE_PASSWORDS",
  "ONEPASSWORD",
  "BITWARDEN",
  "ANALOG",
  "OTHER",
  "UNKNOWN",
] as const;
export type CredentialManager = (typeof CREDENTIAL_MANAGERS)[number];

export const CREDENTIAL_MANAGER_LABELS: Record<CredentialManager, string> = {
  GOOGLE_PASSWORD_MANAGER: "Google パスワードマネージャー",
  MS_EDGE: "Microsoft Edge(パスワード)",
  APPLE_PASSWORDS: "Apple パスワード(iCloudキーチェーン)",
  ONEPASSWORD: "1Password",
  BITWARDEN: "Bitwarden",
  ANALOG: "ブラウザ以外の手帳・メモ等",
  OTHER: "その他(自由記述)",
  UNKNOWN: "不明・要確認",
};

export const DEFAULT_CATEGORIES = ["ゲーム", "SNS", "金融", "通販", "サブスク", "仕事", "その他"] as const;

export interface Account {
  id: string;
  serviceName: string;
  identifier: string | null;
  category: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  expiryDate: string | null;
  notes: string | null;
}

export interface LoginMethod {
  id: string;
  accountId: string;
  type: LoginMethodType;
  provider: string | null;
  linkedAccountId: string | null;
  credentialManager: CredentialManager | null;
  has2fa: boolean;
  maskedCode: string | null;
  createdAt: string;
}

export interface Relation {
  id: string;
  parentAccountId: string;
  childAccountId: string;
  relationType: string;
  note: string | null;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface LoginMethodInput {
  type: LoginMethodType;
  provider?: string | null;
  linkedAccountId?: string | null;
  credentialManager?: CredentialManager | null;
  has2fa?: boolean;
  maskedCode?: string | null;
}

export interface AccountInput {
  serviceName: string;
  identifier?: string | null;
  category?: string;
  status?: AccountStatus;
  lastLoginAt?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
  tags?: string[];
  loginMethods?: LoginMethodInput[];
}

export interface RelationInput {
  parentAccountId: string;
  childAccountId: string;
  relationType: string;
  note?: string | null;
}

export interface AccountDetail {
  account: Account;
  loginMethods: LoginMethod[];
  parents: { account: Account; relation: Relation }[];
  children: { account: Account; relation: Relation }[];
  tags: Tag[];
}

export interface ApiError {
  error: {
    message: string;
    fields?: Record<string, string>;
  };
}

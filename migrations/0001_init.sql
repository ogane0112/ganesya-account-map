-- 0001_init.sql
-- 対象: docs/02_basic_design/db_design.md
-- 内容: accounts / login_methods / relations / tags / account_tags テーブルの初期作成

PRAGMA foreign_keys = ON;

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  service_name TEXT NOT NULL,
  identifier TEXT,
  category TEXT NOT NULL DEFAULT 'その他',
  status TEXT NOT NULL DEFAULT '利用中'
    CHECK (status IN ('利用中', '休眠', '解約済み', '要確認')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT,
  expiry_date TEXT,
  notes TEXT
);

CREATE INDEX idx_accounts_service_name ON accounts(service_name);
CREATE INDEX idx_accounts_category ON accounts(category);
CREATE INDEX idx_accounts_status ON accounts(status);

CREATE TABLE login_methods (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('ID_PW', 'OAuth', 'SNS', 'Card', 'Device')),
  provider TEXT,
  linked_account_id TEXT,
  credential_manager TEXT
    CHECK (
      credential_manager IS NULL OR credential_manager IN (
        'GOOGLE_PASSWORD_MANAGER',
        'MS_EDGE',
        'APPLE_PASSWORDS',
        'ONEPASSWORD',
        'BITWARDEN',
        'ANALOG',
        'OTHER',
        'UNKNOWN'
      )
    ),
  has_2fa INTEGER NOT NULL DEFAULT 0,
  masked_code TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (linked_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE INDEX idx_login_methods_account_id ON login_methods(account_id);

CREATE TABLE relations (
  id TEXT PRIMARY KEY,
  parent_account_id TEXT NOT NULL,
  child_account_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (parent_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (child_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CHECK (parent_account_id <> child_account_id),
  UNIQUE (parent_account_id, child_account_id, relation_type)
);

CREATE INDEX idx_relations_parent ON relations(parent_account_id);
CREATE INDEX idx_relations_child ON relations(child_account_id);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE account_tags (
  account_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (account_id, tag_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_account_tags_tag_id ON account_tags(tag_id);

# DB設計書

- 版数: v1.0
- 作成日: 2026-08-08
- DBMS: Cloudflare D1 (SQLite互換)
- 関連: [要件定義書 7章](../01_requirements/requirements.md#7-データモデル概要), [実装スコープ](./00_implementation_scope.md)

## 1. 設計方針

- 要件定義書7章のデータモデル(Account / LoginMethod / Relation)をベースに、5.8のタグ管理を
  加えた4テーブル構成とする。
- **パスワード・秘密の質問の回答・2FAバックアップコード等の機微情報を保持するカラムは一切設けない**
  (要件定義書5.4)。`login_methods.credential_manager` はあくまで「保存先ツール名」という
  メタデータの列挙値であり、値そのものではない。
- IDはUUID(v4)を文字列(TEXT)として保持する。Cloudflare D1(SQLite)にはUUID型がないため。
- 日時はISO 8601文字列(`YYYY-MM-DDTHH:mm:ss.sssZ`)でTEXT保存する。
- 外部キー制約を有効化し(`PRAGMA foreign_keys = ON`)、参照整合性をDB側で担保する。

## 2. ER図

```
accounts (1) ──< login_methods (N)
accounts (1) ──< login_methods.linked_account_id (任意, 自己参照/他Accountへの参照)
accounts (1) ──< relations.parent_account_id (N)
accounts (1) ──< relations.child_account_id (N)
accounts (N) ──< account_tags >── (N) tags
```

```
+-------------+          +----------------+
|  accounts   |1        N|  login_methods |
+-------------+----------+----------------+
| id (PK)     |          | id (PK)        |
| service_name|          | account_id (FK)|
| identifier  |          | type           |
| category    |          | provider       |
| status      |          | linked_account_id (FK, nullable)
| created_at  |          | credential_manager (nullable)
| last_login_at|         | has_2fa        |
| expiry_date |          +----------------+
| notes       |
+-------------+
      |1                        +-------------+
      |                         |  relations  |
      | N                       +-------------+
      +------------------------>| id (PK)     |
      (parent_account_id)       | parent_account_id (FK)
      +------------------------>| child_account_id (FK)
      (child_account_id)        | relation_type |
                                 | note        |
                                 +-------------+

+-------------+        +--------------+        +-------+
|  accounts   |1      N| account_tags |N      1| tags  |
+-------------+--------+--------------+--------+-------+
| id          |        | account_id(FK)        | id    |
                        | tag_id (FK)           | name  |
                        +--------------+        +-------+
```

## 3. テーブル定義

### 3.1 accounts(アカウント)

| # | カラム名 | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|---|
| 1 | id | TEXT | NOT NULL (PK) | - | UUID |
| 2 | service_name | TEXT | NOT NULL | - | サービス名 |
| 3 | identifier | TEXT | NULL | - | ID・メールアドレス等 |
| 4 | category | TEXT | NOT NULL | 'その他' | ゲーム/SNS/金融/通販/サブスク/仕事/その他 |
| 5 | status | TEXT | NOT NULL | '利用中' | 利用中/休眠/解約済み/要確認 |
| 6 | created_at | TEXT | NOT NULL | - | 登録日時(ISO8601) |
| 7 | updated_at | TEXT | NOT NULL | - | 更新日時(ISO8601) |
| 8 | last_login_at | TEXT | NULL | - | 最終ログイン日時 |
| 9 | expiry_date | TEXT | NULL | - | 更新期限 |
| 10 | notes | TEXT | NULL | - | メモ |

制約:
- `CHECK(status IN ('利用中','休眠','解約済み','要確認'))`

### 3.2 login_methods(ログイン方式)

| # | カラム名 | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|---|
| 1 | id | TEXT | NOT NULL (PK) | - | UUID |
| 2 | account_id | TEXT | NOT NULL (FK→accounts.id) | - | 紐づくアカウント |
| 3 | type | TEXT | NOT NULL | - | ID_PW / OAuth / SNS / Card / Device |
| 4 | provider | TEXT | NULL | - | Google, LINE, バンダイナムコカード等 |
| 5 | linked_account_id | TEXT | NULL (FK→accounts.id) | - | 連携先が本アプリ内Accountの場合のID |
| 6 | credential_manager | TEXT | NULL | - | パスワード保存先の種別(下記列挙値) |
| 7 | has_2fa | INTEGER | NOT NULL | 0 | 2段階認証の有無 (0/1) |
| 8 | masked_code | TEXT | NULL | - | カード/コード型連携時の下4桁等マスク済み識別情報 |
| 9 | created_at | TEXT | NOT NULL | - | 登録日時 |

制約:
- `CHECK(type IN ('ID_PW','OAuth','SNS','Card','Device'))`
- `CHECK(credential_manager IS NULL OR credential_manager IN ('GOOGLE_PASSWORD_MANAGER','MS_EDGE','APPLE_PASSWORDS','ONEPASSWORD','BITWARDEN','ANALOG','OTHER','UNKNOWN'))`
- `FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE`
- `FOREIGN KEY(linked_account_id) REFERENCES accounts(id) ON DELETE SET NULL`

**重要:** このテーブルにパスワードの値・秘密の質問の回答・2FAバックアップコード等の実値を
保存する列を追加してはならない(要件定義書5.4 / 非機能要件6章)。`credential_manager` は
どのツールに保存されているかを示す列挙値のみを保持する。

### 3.3 relations(紐づけ関係・親子構造)

| # | カラム名 | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|---|
| 1 | id | TEXT | NOT NULL (PK) | - | UUID |
| 2 | parent_account_id | TEXT | NOT NULL (FK→accounts.id) | - | 親(認証元)アカウント |
| 3 | child_account_id | TEXT | NOT NULL (FK→accounts.id) | - | 子(連携先)アカウント |
| 4 | relation_type | TEXT | NOT NULL | - | OAuth連携/カード連携/端末紐づけ等 |
| 5 | note | TEXT | NULL | - | 補足情報 |
| 6 | created_at | TEXT | NOT NULL | - | 登録日時 |

制約:
- `FOREIGN KEY(parent_account_id) REFERENCES accounts(id) ON DELETE CASCADE`
- `FOREIGN KEY(child_account_id) REFERENCES accounts(id) ON DELETE CASCADE`
- `CHECK(parent_account_id <> child_account_id)` (自己ループ禁止)
- `UNIQUE(parent_account_id, child_account_id, relation_type)`

### 3.4 tags(タグ)

| # | カラム名 | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|---|
| 1 | id | TEXT | NOT NULL (PK) | - | UUID |
| 2 | name | TEXT | NOT NULL (UNIQUE) | - | タグ名 |

### 3.5 account_tags(アカウント-タグ 中間テーブル)

| # | カラム名 | 型 | NULL | 説明 |
|---|---|---|---|---|
| 1 | account_id | TEXT | NOT NULL (FK→accounts.id) | - |
| 2 | tag_id | TEXT | NOT NULL (FK→tags.id) | - |

制約:
- `PRIMARY KEY(account_id, tag_id)`
- `FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE`
- `FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE`

## 4. インデックス設計

| テーブル | インデックス名 | 対象カラム | 目的 |
|---|---|---|---|
| accounts | idx_accounts_service_name | service_name | 検索の高速化 |
| accounts | idx_accounts_category | category | フィルタ高速化 |
| accounts | idx_accounts_status | status | フィルタ高速化(休眠・要確認検出) |
| login_methods | idx_login_methods_account_id | account_id | アカウント詳細取得時の結合高速化 |
| relations | idx_relations_parent | parent_account_id | 相関図・逆引き表示の高速化 |
| relations | idx_relations_child | child_account_id | 相関図・逆引き表示の高速化 |
| account_tags | idx_account_tags_tag_id | tag_id | タグ別検索の高速化 |

## 5. マイグレーション管理方針

- マイグレーションファイルは `migrations/0001_init.sql` のように連番で管理し、`wrangler d1 migrations apply` で適用する。
- 実体は本リポジトリ `migrations/` ディレクトリを参照。
- 一度適用したマイグレーションファイルは変更せず、変更が必要な場合は新しい連番ファイルを追加する。

## 6. 想定データ量とパフォーマンス

要件定義書6章「数百件規模のアカウント登録でも一覧表示・検索が快適に動作すること」を踏まえ、
数千件規模までは上記インデックスとD1(SQLite)のフルテーブルスキャンで十分な性能が出る想定。
将来的にデータ量が増大した場合は9.4節(要件定義書)の通り他DBへの移行を検討する。

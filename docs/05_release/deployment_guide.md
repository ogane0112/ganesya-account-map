# デプロイ手順書

- 版数: v1.0
- 作成日: 2026-08-08
- 関連: [構成定義書](../02_basic_design/infra_design.md), [CI/CD設計書](../03_detail_design/ci_cd_design.md)

## 1. 前提条件

- Cloudflareアカウントを保有していること
- リポジトリ管理者がGitHub Actions Secretsを設定できること
- `wrangler` CLI が利用できること(`pnpm exec wrangler --version` で確認)

## 2. 初回セットアップ手順(初回のみ)

### 2.1 Cloudflareへのログイン

```
pnpm exec wrangler login
```

### 2.2 D1データベースの作成

```
pnpm exec wrangler d1 create account_map_db
pnpm exec wrangler d1 create account_map_db_preview
```

実行結果に表示される `database_id` を控え、`wrangler.toml` の
`REPLACE_WITH_PRODUCTION_D1_DATABASE_ID` を本番用IDに置き換えてコミットする。
プレビュー用IDはCloudflare Pagesダッシュボード側のFunctions設定で別途割り当てる
(構成定義書3章参照)。

### 2.3 Cloudflare Pagesプロジェクトの作成

```
pnpm exec wrangler pages project create ganesya-account-map
```

### 2.4 マイグレーションの初回適用

```
pnpm exec wrangler d1 migrations apply account_map_db --remote
pnpm exec wrangler d1 migrations apply account_map_db_preview --remote
```

### 2.5 GitHub Actions Secretsの登録

リポジトリの Settings → Secrets and variables → Actions に以下を登録する。

| Secret名 | 値の取得方法 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflareダッシュボード → My Profile → API Tokens で、「Cloudflare Pages編集」「D1編集」権限を持つカスタムトークンを発行 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflareダッシュボードのアカウントホーム右側に表示されるAccount ID |

### 2.6 Cloudflare Accessの設定

[構成定義書4章](../02_basic_design/infra_design.md#4-アクセス制御cloudflare-access設定手順)の手順に従い、
以下2つを両方設定する(片方だけでは不十分)。

1. カスタムドメイン(`accounts.<yourdomain>`)用のAccessアプリケーション
2. `*.pages.dev` ドメイン用のAccessアプリケーション

設定完了後、[運用手順書](./operations_manual.md)のチェックリストにチェックを入れる。

## 3. 通常のデプロイフロー(2回目以降)

初回セットアップ後は、以下のフローで自動デプロイされる。手動操作は不要。

1. `claude/waterfall-dev-process-asy99m` 等の作業ブランチで開発し、`main` へPull Requestを作成する
2. CIワークフロー(`.github/workflows/ci.yml`)が自動実行され、audit/typecheck/test/buildが通ることを確認する
3. `main` へマージする
4. CIが `main` 上で成功すると、Deployワークフロー(`.github/workflows/deploy.yml`)が自動起動し、
   D1マイグレーション適用 → Cloudflare Pagesへのデプロイが実行される

## 4. マイグレーション追加時の注意

新しいマイグレーションファイル(`migrations/0002_xxx.sql`等)を追加した場合、Deployワークフローが
`main`へのマージ時に自動で `wrangler d1 migrations apply` を実行する。**破壊的変更(列削除・型変更等)を
含むマイグレーションは避け、追加型の変更に限定する**([CI/CD設計書6章](../03_detail_design/ci_cd_design.md#6-ロールバック方針)参照)。

## 5. デプロイ後の動作確認

1. Cloudflare Pagesダッシュボードでデプロイが成功していることを確認する
2. `https://accounts.<yourdomain>` にアクセスし、Cloudflare Accessの認証画面が表示されることを確認する
3. 認証後、ダッシュボード画面が表示され、`/api/dashboard` 等のAPIが正常応答することを確認する

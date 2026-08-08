# CI/CD設計書

- 版数: v1.0
- 作成日: 2026-08-08
- 関連: [構成定義書](../02_basic_design/infra_design.md)

## 1. パイプライン概要

GitHub Actionsで以下2つのワークフローを構成する。

| ワークフロー | ファイル | トリガー | 目的 |
|---|---|---|---|
| CI | `.github/workflows/ci.yml` | 全ブランチへのpush、mainへのPull Request | 型チェック・テスト・ビルドの検証(品質ゲート) |
| Deploy | `.github/workflows/deploy.yml` | `main`ブランチへのpush(CIジョブ成功後) | Cloudflare Pagesへの自動デプロイ |

## 2. CIワークフロー

```
on: push, pull_request
jobs:
  quality-gate:
    - pnpm install --frozen-lockfile
    - pnpm audit --audit-level=high         # サプライチェーン脆弱性チェック(要件定義書9.5)
    - pnpm typecheck                        # tsc --noEmit
    - pnpm test -- --run                    # vitest ユニットテスト
    - pnpm build                            # 本番ビルドが通ることを検証
```

`pnpm audit` で high 以上の脆弱性が検出された場合はジョブを失敗させ、後続のマージ・デプロイを
ブロックする。

## 3. Deployワークフロー(デプロイ物からドキュメント/テストを除外)

```
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    - pnpm install --frozen-lockfile
    - pnpm build                            # Vite が src/ のみを dist/ へバンドル
    - デプロイ物検証ステップ:
        dist/ 配下に docs または tests に由来するファイルが存在しないことを確認する
        (例: `test -z "$(find dist -iname '*.md')"` 等の簡易チェック)
    - D1マイグレーション適用:
        wrangler d1 migrations apply account_map_db --remote
    - Cloudflare Pages デプロイ:
        wrangler pages deploy dist --project-name=ganesya-account-map
```

- `docs/`, `tests/`, `migrations/`(適用後), 各種設計書はデプロイジョブの成果物である `dist/`
  に一切コピーされない。Viteのビルドプロセスは `src/` をエントリポイントとしたモジュール解決の
  結果のみを `dist/` に出力するため、参照されていないディレクトリが混入することは構造上ない。
  デプロイ物検証ステップはこれを保証するための追加のセーフティネットとして設ける。
- `wrangler.toml` の `pages_build_output_dir` は `dist` を指す。

## 4. シークレット

| Secret名 | 用途 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | wrangler CLIの認証 |
| `CLOUDFLARE_ACCOUNT_ID` | 対象Cloudflareアカウント |

いずれもGitHub ActionsのRepository Secretsに登録し、ワークフローファイルや設計書には
値を記載しない。

## 5. デプロイフロー図

```
Developer push (feature branch)
        │
        ▼
   CI workflow (typecheck / test / build / audit)
        │  成功
        ▼
   Pull Request → main へマージ
        │
        ▼
   Deploy workflow (main push契機)
        │
        ├─ pnpm build (docs/testsを含まない dist/ を生成)
        ├─ D1 migrations apply
        └─ wrangler pages deploy
        │
        ▼
   Cloudflare Pages (Production) へ反映
        │
        ▼
   Cloudflare Access 経由でのみ利用者がアクセス可能
```

## 6. ロールバック方針

- Cloudflare Pagesは過去のデプロイ履歴を保持するため、問題発生時はダッシュボードから
  直前の正常デプロイへワンクリックでロールバック可能。
- D1マイグレーションは前方互換(カラム追加中心)を基本とし、破壊的変更を伴う場合は
  事前に[運用手順書](../05_release/operations_manual.md)にロールバック手順を追記してから実施する。

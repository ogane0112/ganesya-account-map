# アカウント管理マップ(ganesya-account-map)

ゲーム・SNS・金融サービス等、乱立しがちな各種オンラインアカウントと、その
ログイン方式(ID/PW・OAuth・SNS・カード連携・端末紐づけ)、アカウント同士の
紐づけ関係(親子構造)を一元管理する個人利用向けアプリです。

**パスワードそのものは一切保存しません。** 保存するのは「どの認証情報管理ツール
(1Password、Google パスワードマネージャー等)に保存したか」というメタ情報のみです。
詳細な設計方針は [要件定義書](./docs/01_requirements/requirements.md) を参照してください。

## ドキュメント(ウォーターフォール開発の成果物)

本プロジェクトはウォーターフォール型で開発しており、各工程の成果物を `docs/` 配下に保存しています。

| 工程 | ドキュメント |
|---|---|
| 要件定義 | [要件定義書](./docs/01_requirements/requirements.md) |
| 基本設計 | [実装スコープ定義書](./docs/02_basic_design/00_implementation_scope.md) / [DB設計書](./docs/02_basic_design/db_design.md) / [構成定義書(インフラ)](./docs/02_basic_design/infra_design.md) / [画面定義書](./docs/02_basic_design/screen_design.md) |
| 詳細設計 | [処理定義書(API・処理フロー)](./docs/03_detail_design/process_design.md) / [CI/CD設計書](./docs/03_detail_design/ci_cd_design.md) |
| テスト | [テスト計画書](./docs/04_test/test_plan.md) / [テスト仕様書](./docs/04_test/test_spec.md) |
| リリース・運用 | [デプロイ手順書](./docs/05_release/deployment_guide.md) / [運用手順書](./docs/05_release/operations_manual.md) / [リリースノート](./docs/05_release/release_notes.md) |

## 技術構成

- フロントエンド: React + TypeScript + Vite(SPA、ルーターは外部ライブラリを使わず自前実装)
- バックエンド: Cloudflare Pages Functions(`functions/`)
- データベース: Cloudflare D1(SQLite互換、`migrations/`)
- 共有ロジック: `shared/`(バリデーション・ダッシュボード集計・紐づけ関係のグラフ探索/レイアウト・エクスポート整形の純粋関数。フロント/バックエンド双方から利用)
- テスト: Vitest + Testing Library
- パッケージマネージャー: pnpm(npm不使用。理由は要件定義書9.5節を参照)

詳しい構成図・データモデルは [構成定義書](./docs/02_basic_design/infra_design.md) と
[DB設計書](./docs/02_basic_design/db_design.md) を参照してください。

## ディレクトリ構成

```
src/            フロントエンド(画面・APIクライアント・ロック機能)
functions/      Cloudflare Pages Functions(APIハンドラ、D1アクセス)
shared/         フロント/バックエンド共通の純粋ドメインロジック
migrations/     D1マイグレーションSQL
tests/          vitestによるユニット・コンポーネントテスト
docs/           要件定義書・各種設計書・テスト仕様書・運用ドキュメント(デプロイ物には含まれません)
scripts/        CI/CD用の補助スクリプト
.github/        GitHub Actionsワークフロー(CI/Deploy)・Dependabot設定
```

## セットアップ

```bash
pnpm install
```

## 開発

```bash
pnpm dev          # Viteの開発サーバーを起動(フロントエンドのみ、APIはモック不可)
pnpm build        # 本番ビルド(dist/ を生成)
pnpm typecheck    # フロント/Functions/テストの型チェック
pnpm test         # vitestをwatchモードで実行
pnpm test:run     # vitestを一度だけ実行(CIと同じ)
pnpm audit --audit-level=high   # 依存ライブラリの脆弱性監査
```

フロントエンドとバックエンドAPI(D1含む)を通しで動作確認する場合は、ビルド後に
[wrangler](https://developers.cloudflare.com/workers/wrangler/) でローカル実行します。

```bash
pnpm build
pnpm exec wrangler d1 migrations apply account_map_db --local
pnpm exec wrangler pages dev dist --local
```

## デプロイ

`main` ブランチへのマージをトリガーに、GitHub Actions(`.github/workflows/deploy.yml`)が
CI成功後にD1マイグレーション適用とCloudflare Pagesへのデプロイを自動実行します。
初回セットアップの手順は [デプロイ手順書](./docs/05_release/deployment_guide.md) を参照してください。

# 構成定義書(インフラ設計書)

- 版数: v1.0
- 作成日: 2026-08-08
- 関連: [要件定義書 9章](../01_requirements/requirements.md#9-技術要件実装方針)

## 1. システム構成図

```
                     ┌────────────────────────┐
   利用者(本人)  ───▶│ Cloudflare Access       │  Googleアカウント等でSSO認証
   (ブラウザ)         │ (Zero Trust)            │  許可メールアドレスのみ通過
                     └───────────┬─────────────┘
                                 │ 認証済みリクエストのみ通過
                                 ▼
                     ┌────────────────────────┐
                     │ Cloudflare Pages        │  静的アセット配信(SPA)
                     │  accounts.<domain>      │  *.pages.dev も同様に保護
                     │  + Pages Functions      │  /api/* をサーバーレスAPIとして実行
                     └───────────┬─────────────┘
                                 │ D1 binding (ACCOUNT_DB)
                                 ▼
                     ┌────────────────────────┐
                     │ Cloudflare D1           │  accounts / login_methods /
                     │ (SQLite互換)            │  relations / tags / account_tags
                     └────────────────────────┘
```

## 2. 環境構成

| 環境 | ブランチ | Pagesプロジェクト | D1データベース | 用途 |
|---|---|---|---|---|
| Production | `main` | `ganesya-account-map` (Production) | `account_map_db` | 本番運用 |
| Preview | 上記以外の全ブランチ/PR | `ganesya-account-map` (Preview) | `account_map_db_preview` | 動作確認用プレビュー |

- Cloudflare Pagesはブランチごとにプレビューデプロイを自動生成する。本番運用ドメインは `main` ブランチのデプロイにのみ紐付ける。
- D1データベースは本番/プレビューで分離し、開発中の検証データが本番データに混入しないようにする。

## 3. ディレクトリとデプロイ対象の切り分け

CI/CDでのデプロイ時に設計書・要件定義書等のドキュメント一式(`docs/`)がデプロイ物に
含まれないよう、以下の方針で構成する。

| ディレクトリ | 内容 | デプロイ対象 |
|---|---|---|
| `src/` | フロントエンド(React + Vite + TypeScript)ソース | Viteビルドにより `dist/` へバンドル → デプロイ対象 |
| `functions/` | Cloudflare Pages Functions(API) | Pagesが直接デプロイ → デプロイ対象 |
| `migrations/` | D1マイグレーションSQL | CIの「D1マイグレーション適用」ステップでのみ使用。Pages成果物には含めない |
| `docs/` | 要件定義書・設計書・テスト仕様書等 | **デプロイ対象外**(Viteの `dist/` ビルド成果物にもPages Functionsにも一切含まれない) |
| `tests/` | vitestのユニットテスト | **デプロイ対象外**(ビルド成果物に含まれない) |

Viteは `src/` 配下のみをエントリポイントからバンドルするため、`docs/` や `tests/` を
参照しない限りビルド成果物 `dist/` に混入することはない。念のためCIのデプロイ前チェックで
`dist/` 配下に `docs` 由来のファイルが存在しないことを確認するステップを設ける
([CI/CD設計](../03_detail_design/ci_cd_design.md)参照)。

## 4. アクセス制御(Cloudflare Access)設定手順

要件定義書9.3節の通り、以下2つのAccessアプリケーションを両方設定する。

1. **カスタムドメイン保護**
   - Zero Trustダッシュボード → Access → Applications → Add an application
   - Application domain: `accounts.<yourdomain>`
   - Policy: Include = 本人のメールアドレスのみ
2. **`*.pages.dev` ドメイン保護**
   - Cloudflare Pagesプロジェクト設定 → "Enable access policy" を有効化
   - 同様に許可メールアドレスを限定したAccessアプリケーションを作成

この手順はダッシュボード操作(Cloudflare側の管理コンソール)であり、アプリケーションコードや
CI/CDの範囲外である。手順は本書と[運用手順書](../05_release/operations_manual.md)に記録し、
実施状況をチェックリストで管理する。

## 5. シークレット・環境変数管理

| 変数名 | 用途 | 管理場所 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | GitHub ActionsからCloudflareへデプロイするためのAPIトークン | GitHub Actions Secrets |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflareアカウント識別子 | GitHub Actions Secrets |
| `ACCOUNT_DB`(D1 binding名) | Pages Functionsから参照するD1バインディング | `wrangler.toml` |

APIトークンは「Cloudflare Pages編集」「D1編集」に必要な最小権限のカスタムトークンを発行し、
リポジトリのSecretsにのみ保存する。トークンやアカウントIDをコード・ドキュメントに直接
記載しない。

## 6. バックアップ・リカバリ方針

- D1は自動的にCloudflare側で冗長化されるが、アプリ側の論理バックアップとして、設定画面の
  エクスポート機能(CSV/JSON)を定期的に手動実行する運用とする(要件定義書5.7)。
- 誤ってレコードを削除した場合の復旧は、直近のエクスポートファイルからのインポート、または
  `wrangler d1 export` によるスナップショットから復元する。

## 7. 監視・ログ

- Cloudflare Pages / Functionsの実行ログはCloudflareダッシュボードの「Logs」機能で確認する。
- 個人利用規模のため、外部APMツールは導入せず、Cloudflare標準機能の範囲で運用する
  (9.5節の依存最小化方針に合わせる)。

## 8. 依存ライブラリ管理(サプライチェーンセキュリティ)

要件定義書9.5節の方針をインフラ・CI/CD観点で補足する。

| 項目 | 内容 |
|---|---|
| パッケージマネージャー | pnpm のみを使用し、`pnpm-lock.yaml` をリポジトリにコミットする |
| CIでの検証 | GitHub Actionsのワークフロー内で `pnpm audit --audit-level=high` を実行し、高リスク以上の脆弱性があればデプロイを中断する |
| Dependabot | `.github/dependabot.yml` を設定し、依存ライブラリの更新提案を定期的に受け取る(自動マージはしない) |
| 導入ライブラリの最小化 | フロントエンドはReact/Vite/TypeScriptの標準構成に限定し、相関図描画やUIコンポーネントは自前のSVG実装で賄い、追加ライブラリを増やさない |

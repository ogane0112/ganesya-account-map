# 処理定義書(詳細設計)

- 版数: v1.0
- 作成日: 2026-08-08
- 関連: [DB設計書](../02_basic_design/db_design.md), [画面定義書](../02_basic_design/screen_design.md)

## 1. API一覧

すべてCloudflare Pages Functions(`functions/api/`配下)として実装する。レスポンスは`application/json`。

| # | メソッド | パス | 概要 | 実装ファイル |
|---|---|---|---|---|
| 1 | GET | `/api/accounts` | アカウント一覧取得(検索/フィルタ/ソート対応) | `functions/api/accounts/index.ts` |
| 2 | POST | `/api/accounts` | アカウント新規登録(ログイン方式・タグを同時登録可) | `functions/api/accounts/index.ts` |
| 3 | GET | `/api/accounts/[id]` | アカウント詳細取得(ログイン方式・親子関係・タグを含む) | `functions/api/accounts/[id].ts` |
| 4 | PUT | `/api/accounts/[id]` | アカウント更新 | `functions/api/accounts/[id].ts` |
| 5 | DELETE | `/api/accounts/[id]` | アカウント削除(関連するlogin_methods/relationsはCASCADE削除) | `functions/api/accounts/[id].ts` |
| 6 | POST | `/api/accounts/[id]/login-methods` | ログイン方式追加 | `functions/api/accounts/[id]/login-methods.ts` |
| 7 | PUT | `/api/login-methods/[id]` | ログイン方式更新 | `functions/api/login-methods/[id].ts` |
| 8 | DELETE | `/api/login-methods/[id]` | ログイン方式削除 | `functions/api/login-methods/[id].ts` |
| 9 | GET | `/api/relations` | 全紐づけ関係取得(相関図描画用) | `functions/api/relations/index.ts` |
| 10 | POST | `/api/relations` | 紐づけ関係登録 | `functions/api/relations/index.ts` |
| 11 | DELETE | `/api/relations/[id]` | 紐づけ関係削除 | `functions/api/relations/[id].ts` |
| 12 | GET | `/api/dashboard` | ダッシュボード集計取得 | `functions/api/dashboard.ts` |
| 13 | GET | `/api/export?format=json\|csv` | 全データエクスポート | `functions/api/export.ts` |

すべての一覧・変更系APIはドメインロジック(バリデーション・集計・グラフ用データ整形)を
`functions/lib/`配下の純粋関数として切り出し、Pages Functionsのハンドラから呼び出す構成とする。
これにより、Cloudflareランタイムに依存しないロジック単体をvitestでユニットテストできるようにする
([テスト計画書](../04_test/test_plan.md)参照)。

## 2. 主要処理フロー

### 2.1 アカウント新規登録処理

```
[SC-04 登録フォーム]
    │ 入力内容(基本情報 + ログイン方式[] + タグ[])
    ▼
POST /api/accounts
    │
    ├─ 1. バリデーション (functions/lib/validation.ts: validateAccountInput)
    │     - service_name 必須
    │     - status が許可値のいずれかであること
    │     - ログイン方式ごとに type別必須項目チェック
    │       (ID_PW → credential_manager必須 / Card → masked_codeが4桁以内の数字)
    │     - NGならバリデーションエラー一覧を422で返却
    │
    ├─ 2. UUID発行 (crypto.randomUUID) し accounts へ INSERT
    ├─ 3. login_methods を account_id 紐付けでバルク INSERT
    ├─ 4. タグは既存tagsを名前で検索、無ければINSERTしてaccount_tagsへ関連付け
    │     (functions/lib/tags.ts: upsertTags)
    │
    └─ 5. 登録したアカウントの詳細(2.2と同じ形)を201で返却
```

### 2.2 アカウント詳細取得処理

```
GET /api/accounts/:id
    │
    ├─ 1. accounts をIDで取得。存在しなければ404
    ├─ 2. login_methods を account_id で取得(配列)
    ├─ 3. relations を parent_account_id = :id (子一覧) と
    │       child_account_id = :id (親一覧) の両方向で取得
    ├─ 4. account_tags 経由で tags を取得
    └─ 5. 上記を1つのJSONにまとめて200で返却
        {
          account: {...},
          loginMethods: [...],
          parents: [{account, relation}],
          children: [{account, relation}],
          tags: [...]
        }
```

### 2.3 ダッシュボード集計処理

```
GET /api/dashboard
    │
    ├─ 1. accounts 全件取得
    ├─ 2. functions/lib/dashboard.ts: buildDashboardSummary(accounts, now, thresholds) で集計
    │     - ステータス別件数
    │     - 休眠判定: status !== '解約済み' かつ
    │       last_login_at が null、または now - last_login_at >= dormantThresholdDays(既定180日)
    │     - 要確認: status === '要確認'
    │     - 期限間近: expiry_date が null でなく、
    │       0 <= (expiry_date - now) <= expiryThresholdDays(既定30日)
    └─ 3. 集計結果をJSONで返却
```

`buildDashboardSummary` は日付判定を含む純粋関数とし、`now`を引数として外部から注入することで
テスト時に任意の基準日を指定できるようにする([テスト仕様書](../04_test/test_spec.md)参照)。

### 2.4 紐づけ関係(Relation)登録処理

```
POST /api/relations
    │
    ├─ 1. バリデーション
    │     - parent_account_id と child_account_id が共に存在するaccountsか
    │     - parent_account_id !== child_account_id (自己ループ禁止)
    │     - 循環参照チェック: child側から親方向に辿って parent_account_id に到達しないか
    │       (functions/lib/graph.ts: wouldCreateCycle)
    │     - 循環になる場合は422エラー「循環した紐づけは登録できません」
    └─ 2. relations へ INSERT し201で返却
```

### 2.5 紐づけ関係Graphレイアウト処理(フロントエンド)

SC-05(紐づけ関係図)は外部グラフ描画ライブラリを使わず、`src/lib/graphLayout.ts` の
純粋関数でノード座標を計算し、Reactコンポーネント側でSVGとして描画する。

```
入力: accounts[], relations[]
    │
    ├─ 1. relations から隣接リストを構築(親→子)
    ├─ 2. ルートノード(他ノードの子になっていないノード)を抽出
    ├─ 3. ルートから幅優先探索(BFS)で深さ(depth)を確定
    │     depth = ツリーの縦方向レベルとしてY座標に使用
    ├─ 4. 同depth内での出現順にX座標を等間隔に割り当て
    └─ 5. { nodes: [{id, x, y}], edges: [{from, to}] } を返却
```

逆引き(祖先/子孫)表示は `functions/lib/graph.ts` の `getAncestors` / `getDescendants` を
フロントエンドと共通のロジックとして `src/lib` にも同等実装を持つ(小規模なため重複実装を許容し、
グラフ操作のためだけに状態管理ライブラリを追加しない方針とする)。

### 2.6 マスターパスワードロック処理

```
[SC-06 設定画面でマスターパスワード設定]
    │ 入力: 平文パスワード
    ▼
src/lib/lock.ts: hashPassword(password)
    │  Web Crypto API (crypto.subtle.digest('SHA-256', ...)) でハッシュ化
    ▼
localStorage.setItem('lockHash', hashHex)   // 平文は一切保存しない

[SC-00 ロック画面で入力]
    │ 入力: 平文パスワード
    ▼
hashPassword(input) と localStorage の lockHash を比較
    │ 一致 → sessionStorage.setItem('unlocked', '1') → ダッシュボードへ
    └ 不一致 → エラーメッセージ表示
```

ロック状態はブラウザタブを閉じると解除される(`sessionStorage`)。マスターパスワードの
ハッシュ自体はサーバーに送信・保存しない(端末ローカルのみで完結する簡易ロックであり、
本アプリのAPIを直接叩けば回避できる点は限界として[運用手順書](../05_release/operations_manual.md)に明記し、
実運用上の主たるアクセス制御はCloudflare Access側で担保する)。

### 2.7 エクスポート処理

```
GET /api/export?format=json
    │
    ├─ 1. accounts, login_methods, relations, tags, account_tags を全件取得
    ├─ 2. functions/lib/export.ts: toExportJson() で1つのJSONにまとめる
    └─ 3. Content-Disposition: attachment 付きで返却

GET /api/export?format=csv
    │
    ├─ 1. accounts を取得し、ログイン方式は1行にカンマ区切りで要約
    ├─ 2. functions/lib/export.ts: toExportCsv() でCSV文字列生成(RFC4180準拠のクォート処理)
    └─ 3. Content-Type: text/csv で返却
```

## 3. バリデーションルール一覧

| 対象 | ルール |
|---|---|
| service_name | 必須、1〜100文字 |
| category | 事前定義値(ゲーム/SNS/金融/通販/サブスク/仕事/その他)または自由入力40文字以内 |
| status | `利用中`/`休眠`/`解約済み`/`要確認` のいずれか |
| login_methods.type | `ID_PW`/`OAuth`/`SNS`/`Card`/`Device` のいずれか |
| login_methods.credential_manager | type=ID_PWの場合必須。列挙値のいずれか |
| login_methods.masked_code | type=Cardの場合、数字とアスタリスクのみ、4文字以内 |
| relations | 自己ループ禁止、循環禁止、(parent, child, type)の組み合わせ重複禁止 |

## 4. エラーハンドリング方針

| HTTPステータス | 用途 |
|---|---|
| 400 | リクエストボディのJSONパース失敗等の形式エラー |
| 404 | 指定IDのリソースが存在しない |
| 422 | バリデーションエラー(業務ルール違反) |
| 500 | 想定外エラー。詳細はCloudflareのログにのみ出力し、レスポンスには内部情報を含めない |

すべてのエラーレスポンスは `{ "error": { "message": string, "fields"?: Record<string,string> } }` の形式に統一する。

# テスト仕様書

- 版数: v1.0
- 作成日: 2026-08-08
- 関連: [テスト計画書](./test_plan.md)

各テストケースIDは実装ファイル内の `it(...)` ブロックと対応する。

## 1. バリデーション(shared/validation.ts) — `tests/unit/validation.test.ts`

| ID | 観点 | 入力 | 期待結果 |
|---|---|---|---|
| UT-VAL-001 | 正常系 | serviceNameのみ指定 | valid=true、status既定値'利用中'、category既定値'その他' |
| UT-VAL-002 | 異常系 | serviceName未指定 | valid=false、fields.serviceNameにエラー |
| UT-VAL-003 | 異常系 | serviceNameが101文字 | valid=false、fields.serviceNameにエラー |
| UT-VAL-004 | 異常系 | statusが不正な文字列 | valid=false、fields.statusにエラー |
| UT-VAL-005 | 正常系 | ID_PW方式でcredentialManagerあり | valid=true |
| UT-VAL-006 | 異常系(5.4関連) | ID_PW方式でcredentialManager未指定 | valid=false、`loginMethods[0].credentialManager`にエラー |
| UT-VAL-007 | 異常系 | Card方式でmaskedCodeが5桁 | valid=false、`loginMethods[0].maskedCode`にエラー |
| UT-VAL-008 | 正常系 | Card方式でmaskedCodeが"1234" | valid=true |
| UT-VAL-009 | 正常系 | tagsに重複・空白混じりの配列 | trim済み・空文字除外されたtags配列を返す |
| UT-VAL-010 | 異常系(Relation) | parentAccountId === childAccountId | valid=false、fields.childAccountIdにエラー |
| UT-VAL-011 | 正常系(Relation) | parent/child/relationTypeすべて指定 | valid=true |

## 2. ダッシュボード集計(shared/dashboard.ts) — `tests/unit/dashboard.test.ts`

基準日 `now = 2026-08-08T00:00:00.000Z` を固定して検証する。

| ID | 観点 | 入力 | 期待結果 |
|---|---|---|---|
| UT-DASH-001 | 休眠判定 | lastLoginAtがnow-200日、status='利用中' | dormantAccountsに含まれる |
| UT-DASH-002 | 休眠判定(除外) | status='解約済み'、lastLoginAtがnow-200日 | dormantAccountsに含まれない |
| UT-DASH-003 | 休眠判定 | lastLoginAtがnull | dormantAccountsに含まれる |
| UT-DASH-004 | 休眠判定(境界) | lastLoginAtがnow-179日 | dormantAccountsに含まれない(閾値180日未満) |
| UT-DASH-005 | 要確認 | status='要確認' | needsReviewAccountsに含まれる |
| UT-DASH-006 | 期限間近 | expiryDateがnow+10日 | expiringAccountsに含まれる |
| UT-DASH-007 | 期限間近(境界外) | expiryDateがnow+31日 | expiringAccountsに含まれない(既定閾値30日超) |
| UT-DASH-008 | 期限切れ | expiryDateがnow-1日(既に期限切れ) | expiringAccountsに含まれない(仕様上「間近」のみ対象) |
| UT-DASH-009 | 集計件数 | 複数ステータスのアカウント配列 | statusCounts/totalCountが正しく集計される |

## 3. 紐づけ関係グラフ探索(shared/graph.ts) — `tests/unit/graph.test.ts`

| ID | 観点 | 入力 | 期待結果 |
|---|---|---|---|
| UT-GRAPH-001 | 子孫取得 | Google→バンダイナムコID→ゲームA の関係 | `getDescendants(relations, "google")` が `["バンダイナムコID","ゲームA"]` を含む |
| UT-GRAPH-002 | 祖先取得 | 同上 | `getAncestors(relations, "ゲームA")` が `["バンダイナムコID","google"]` を含む |
| UT-GRAPH-003 | 循環検出(自己ループ) | parent === child | `wouldCreateCycle` が true |
| UT-GRAPH-004 | 循環検出(間接循環) | A→B→C が既存の状態でC→Aを追加しようとする | `wouldCreateCycle(relations, "C", "A")` が true |
| UT-GRAPH-005 | 循環なし | A→B が既存の状態でA→Cを追加しようとする | `wouldCreateCycle(relations, "A", "C")` が false |

## 4. グラフレイアウト(shared/graphLayout.ts) — `tests/unit/graphLayout.test.ts`

| ID | 観点 | 入力 | 期待結果 |
|---|---|---|---|
| UT-LAYOUT-001 | ルート検出 | 親A→子B のみ | Aのdepthが0、Bのdepthが1 |
| UT-LAYOUT-002 | 孤立ノード | 関係を持たないアカウント | depth 0として配置される(エラーにならない) |
| UT-LAYOUT-003 | エッジ生成 | relations複数件 | edgesの件数がrelationsの件数と一致する |

## 5. エクスポート(shared/export.ts) — `tests/unit/export.test.ts`

| ID | 観点 | 入力 | 期待結果 |
|---|---|---|---|
| UT-EXPORT-001 | JSON出力 | ExportBundle | JSON.parseした結果が元のaccounts等を含む |
| UT-EXPORT-002 | CSV出力(ヘッダー) | accounts=[] | ヘッダー行のみが出力される |
| UT-EXPORT-003 | CSVエスケープ | notesにカンマを含む文字列 | 該当フィールドがダブルクォートで囲まれる |
| UT-EXPORT-004 | ログイン方式要約 | 1アカウントに複数のloginMethods | loginMethods列に`type:provider`がセミコロン区切りで含まれる |

## 6. マスターパスワードロック(src/lib/lock.ts) — `tests/unit/lock.test.ts`

| ID | 観点 | 操作 | 期待結果 |
|---|---|---|---|
| UT-LOCK-001 | 未設定時 | ロック未設定の状態で`isUnlocked()` | true(要件定義書8章「未設定時はスキップ」) |
| UT-LOCK-002 | 設定・照合成功 | `setLockPassword("abcd")`後に`tryUnlock("abcd")` | true、以後`isUnlocked()`もtrue |
| UT-LOCK-003 | 照合失敗 | `setLockPassword("abcd")`後に`tryUnlock("wrong")` | false、`isUnlocked()`はfalseのまま |
| UT-LOCK-004 | 平文非保存 | `setLockPassword("abcd")`後の`localStorage`の中身 | 平文"abcd"がそのまま含まれないこと(ハッシュ値であること) |
| UT-LOCK-005 | ロック解除 | `clearLockPassword()`実行後 | `isLockConfigured()`がfalseになる |

## 7. コンポーネントテスト — `tests/unit/components/`

| ID | 対象 | 観点 | 期待結果 |
|---|---|---|---|
| UT-COMP-001 | StatusBadge | status='要確認'を渡す | "要確認"というテキストが描画される |
| UT-COMP-002 | LockScreen | パスワード未入力で送信 | 画面がクラッシュせず、入力欄が表示され続ける |

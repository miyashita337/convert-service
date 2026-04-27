# QuickConv KPI 定義と測定方法

本ドキュメントは QuickConv の主要 KPI、各指標の測定方法・データソース・目標値を定義する。月次確認フロー（誰が・いつ・何を見るか）は [MONTHLY_REPORT_TEMPLATE.md](./MONTHLY_REPORT_TEMPLATE.md) を参照。

## 概要

- **目的**: 副業プロジェクトとしての健全性（コスト < 収益）と成長軌道を定量的に把握する
- **対象期間**: ローンチ（2026-04-06）から月次で計測。Phase 1（〜3ヶ月）/ Phase 2（〜6ヶ月）の達成度をトラックする
- **目標値の出所**: [GRAND_DESIGN.md § KPI](./GRAND_DESIGN.md#kpi) と本ドキュメントを single source of truth とする（Phase 1/2 数値は GRAND_DESIGN を引用）

## KPI 一覧

| 分類 | 指標 | 単位 | データソース | 集計頻度 | Phase 1 目標 | Phase 2 目標 |
|---|---|---|---|---|---|---|
| 取得 | DAU | 人 | GA4 | 日次 / 月平均 | 100 | 500 |
| 取得 | 新規訪問者数 | 人 | GA4 | 月次 | — | — |
| 取得 | オーガニック流入比 | % | GA4（Source/Medium） | 月次 | > 30% | > 40% |
| エンゲージ | 月間変換数 | 回 | D1 (`conversions` テーブル) | 月次 | 3,000 | 15,000 |
| エンゲージ | 変換完了率 | % | D1（成功 / 試行） | 月次 | > 40% | > 50% |
| エンゲージ | 平均変換数/ユーザー | 回 | D1 | 月次 | 3 | 5 |
| コンバージョン | Free → Paid CVR | % | Stripe Dashboard + GA4 | 月次 | — | 2-4% |
| コンバージョン | プラン別購入比率 | % | Stripe Dashboard | 月次 | — | — |
| 収益 | MRR（月次経常収益） | ¥ | Stripe Dashboard | 月次 | — | ¥30,000+ |
| 収益 | ARPU | ¥ | Stripe / 課金ユーザー数 | 月次 | — | — |
| 運用 | エラー率（API） | % | Sentry (Workers) | 日次 / 月次 | < 1% | < 0.5% |
| 運用 | Cloud Run コスト | ¥ | GCP Billing | 月次 | < ¥1,000 | < ¥5,000 |
| 運用 | 平均変換時間 | ms | Sentry Performance | 月次 | < 3,000 | < 2,000 |

> Phase 1/2 数値の出典は [GRAND_DESIGN.md § KPI](./GRAND_DESIGN.md#kpi)。乖離が出たら GRAND_DESIGN 側を真として本表を追従させる。

## 各 KPI の測定方法

### 取得系（Acquisition）

#### DAU（Daily Active Users）

- **定義**: 1 日に少なくとも 1 回 quickconv.cc にアクセスしたユニークユーザー数
- **データソース**: GA4 → Reports → User → User acquisition → "Active users" カード
- **集計クエリ**: GA4 標準レポート（カスタムクエリ不要）
- **月平均の取り方**: 当月 DAU の単純平均（GA4 の Date range で月指定）
- **注意**: 自分自身のアクセスは GA4 の IP 除外設定で除外する

#### 新規訪問者数

- **定義**: 当月初訪問のユニークユーザー数
- **データソース**: GA4 → Acquisition → "New users" メトリクス
- **目的**: ローンチ直後はトラフィック量、Phase 2 以降はリテンション分析の母数

#### オーガニック流入比

- **定義**: 全セッション中、流入元が `google / organic` または `direct` の比率
- **データソース**: GA4 → Acquisition → Traffic acquisition → Default channel grouping
- **計算式**: `(Organic Search + Direct のセッション数) / 全セッション数 × 100`
- **目的**: 広告・SNS 流入だけでなく検索エンジンに評価されているか

### エンゲージメント系

#### 月間変換数

- **定義**: ユーザーが完了した変換ジョブ数（Free + 全有料プラン合算）
- **データソース**: D1 `conversions` テーブル（または相当の variant 名 — 実テーブル名は `apps/api/src/db/schema.ts` 参照）
- **集計クエリ例**:

  ```sql
  SELECT COUNT(*) FROM conversions
  WHERE status = 'completed'
    AND created_at >= '2026-MM-01' AND created_at < '2026-(MM+1)-01';
  ```

- **実行手段**: `cd apps/api && npx wrangler d1 execute quickconv-db --remote --command "<上記 SQL>"`

#### 変換完了率

- **定義**: 試行された変換のうち、エラーなく完了した割合
- **計算式**: `completed / (completed + failed) × 100`
- **データソース**: D1（`status` カラム）
- **目的**: 高ければ UX が安定している、低ければエラー監視（Sentry）と組み合わせて原因特定

#### 平均変換数/ユーザー

- **定義**: 当月の月間変換数 / 当月の MAU
- **データソース**: D1（変換数）+ GA4（MAU）
- **目的**: ヘビーユーザーが増えているか / Free 上限（10 回/日）に張り付いているかの判断材料

### コンバージョン系

#### Free → Paid CVR

- **定義**: 当月の有料プラン新規購入者数 / 当月の MAU
- **データソース**: Stripe Dashboard → Customers（新規） + GA4 MAU
- **計算頻度**: 月次（リアルタイム不要）
- **目的**: マネタイズ効率の核指標。Phase 2 で 2-4% 達成が黒字化の前提

#### プラン別購入比率

- **定義**: Good（買い切り）/ Better（Plus 月額）/ Best（Pro 月額）の構成比
- **データソース**: Stripe Dashboard → Subscriptions / Payments を `price_id` でグループ
- **目的**: Better 推奨表示が機能しているか。Good に偏っている場合は値付け見直し

### 収益系

#### MRR（月次経常収益）

- **定義**: 当月にアクティブな月額サブスクリプションの月額合計（買い切りパスは別集計）
- **データソース**: Stripe Dashboard → Reports → "Monthly recurring revenue"
- **注意**: 年払いは月割りで MRR にカウント（Stripe 標準仕様）

#### ARPU

- **定義**: 当月収益（MRR + 買い切り収益）/ 当月の課金済みユーザー数
- **データソース**: Stripe（売上）+ Stripe Customers（unique paying user 数）

### 運用・品質系

#### エラー率（API）

- **定義**: API 全リクエストに対する 5xx 応答の割合
- **データソース**: Sentry (Workers project) → Issues / Performance
- **集計**: Sentry の "Failure rate" チャートを月次平均
- **アラート連動**: [ALERT_RULES.md](./ALERT_RULES.md) Alert-2（5 分で 10 件以上）と二段構え

#### Cloud Run コスト

- **定義**: GCP Cloud Run（Converter）の当月費用（無料枠超過分）
- **データソース**: GCP Console → Billing → Reports（プロジェクト `quickconv-489717`）
- **目的**: コスト > 収益にならないか早期検知。Phase 1 は無料枠内で完結が目標

#### 平均変換時間

- **定義**: Sharp 変換ジョブの処理時間（リクエスト受信〜レスポンス返却）の中央値
- **データソース**: Sentry Performance（Transaction `POST /convert` の `p50`）
- **目的**: 体験品質。3 秒超えるとユーザー離脱が顕著になる経験則

## ダッシュボード URL（運用時に追記）

| ツール | URL | 備考 |
|---|---|---|
| GA4 | `https://analytics.google.com/analytics/web/#/p<PROPERTY_ID>/reports/intelligenthome` | Property ID は `apps/web/.env` を参照 |
| Stripe | `https://dashboard.stripe.com/dashboard` | Live mode |
| Sentry (Workers) | `https://<org>.sentry.io/projects/quickconv-api/` | 組織 slug は別途確認 |
| Sentry (Frontend) | `https://<org>.sentry.io/projects/quickconv-web/` | 同上 |
| Sentry (Converter) | `https://<org>.sentry.io/projects/quickconv-converter/` | 同上 |
| GCP Billing | `https://console.cloud.google.com/billing` | プロジェクト `quickconv-489717` |
| Cloudflare Analytics | `https://dash.cloudflare.com/<ACCOUNT_ID>/analytics` | Workers / Pages 両方 |

> URL のプロパティ ID / 組織 slug は機密ではないが、運用時にダッシュボードへ直接ジャンプできるよう本テーブルに具体値を記入していく。値はリポジトリにコミット可（公開しても害がない範囲のもののみ）。

## アラート連動

- 日次・月次の手動確認に加えて、しきい値を逸脱した場合は [ALERT_RULES.md](./ALERT_RULES.md) で定義した Sentry → Pushover 通知が即時発火する
- KPI 視点で追加すべきアラート（例: Cloud Run コストが月初 1 週間で ¥500 超過）は別 Issue で管理する

## 改定履歴

| 日付 | 変更 |
|---|---|
| 2026-04-27 | 初版作成（Issue #238） |

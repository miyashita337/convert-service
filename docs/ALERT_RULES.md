# QuickConv Alert Rules

Sentry Dashboard で設定するアラートルールの設計書。
通知先は全て Pushover（Sentry Webhook Integration 経由）。

## 通知チャネル

| チャネル | 優先度 | 用途 |
|---|---|---|
| Pushover (normal) | 0 | 通常通知（音あり） |
| Pushover (urgent) | 1 | 緊急通知（確認するまで繰り返し通知） |

## アラートルール一覧

### Alert-1: 新規エラー発生

| 項目 | 値 |
|---|---|
| トリガー | `first_seen` イベント（新しい Issue が作成された時） |
| 条件 | 自動（Sentry が新規 Issue を検出） |
| 通知先 | Pushover (normal) |
| 重複抑制 | 1 時間 |
| 対応 | Sentry Dashboard で Issue を確認し、優先度を判断 |

**Sentry 設定手順:**
1. Alerts > Create Alert > Issues
2. When: A new issue is created
3. Then: Send a notification via Pushover Webhook
4. Action Interval: 60 minutes

### Alert-2: エラースパイク

| 項目 | 値 |
|---|---|
| トリガー | 5 分間でイベント 10 件以上 |
| 条件 | `times_seen` > 10 in 5 minutes |
| 通知先 | Pushover (urgent) |
| 重複抑制 | 1 時間 |
| 対応 | 即座にログ確認。デプロイ直後ならロールバック検討 |

**Sentry 設定手順:**
1. Alerts > Create Alert > Metric
2. When: Number of events in 5 minutes > 10
3. Then: Send a notification via Pushover Webhook (priority=1)
4. Action Interval: 60 minutes

### Alert-3: OOM 検知（メモリ高使用率）

| 項目 | 値 |
|---|---|
| トリガー | メモリ使用率 80% 超（Converter の `checkMemoryUsage` による warning） |
| 条件 | `message:Memory usage high` AND `level:warning` |
| 通知先 | Pushover (normal) |
| 重複抑制 | 1 時間 |
| 対応 | Cloud Run インスタンスのメモリ設定確認。必要に応じてスケール |

**Sentry 設定手順:**
1. Alerts > Create Alert > Issues
2. When: An event's message contains "Memory usage high"
3. If: The event's level is equal to warning
4. Then: Send a notification via Pushover Webhook
5. Action Interval: 60 minutes

### Alert-4: 変換成功率低下

| 項目 | 値 |
|---|---|
| トリガー | 変換成功率 95% 未満（5 分間） |
| 条件 | Sentry Discover クエリで error rate > 5% |
| 通知先 | Pushover (urgent) |
| 重複抑制 | 1 時間 |
| 対応 | Converter ログ確認。特定フォーマットの失敗集中がないか調査 |

**Sentry 設定手順:**
1. Alerts > Create Alert > Metric
2. When: Percentage of events with `level:error` AND `service:quickconv-converter` > 5% in 5 minutes
3. Then: Send a notification via Pushover Webhook (priority=1)
4. Action Interval: 60 minutes

**Sentry Discover クエリ（手動確認用）:**
```
# 変換成功率
SELECT count_if(level, notEquals, 'error') / count() * 100 AS success_rate
FROM events
WHERE service:quickconv-converter AND timestamp > -1h
```

## カスタムメトリクス活用（Sentry Discover）

E8-6 で追加したカスタムタグを使い、以下のクエリが可能:

```
# フォーマット別の変換回数
SELECT conversion_format, count()
FROM events
WHERE service:quickconv-converter
GROUP BY conversion_format

# P95 変換時間
SELECT p95(conversion_duration_ms)
FROM events
WHERE service:quickconv-converter

# レート制限発生率
SELECT count_if(rate_limited, equals, 'true') / count() * 100 AS rate_limit_pct
FROM events
WHERE service:quickconv-api
```

## Pushover Webhook 設定手順

### 1. Pushover アプリ作成

1. [Pushover Dashboard](https://pushover.net/apps) にログイン
2. Create an Application/API Token
3. Application Name: `QuickConv Sentry`
4. API Token をメモ

### 2. Sentry Integration 設定

1. Sentry > Settings > Integrations > Webhooks
2. Webhook URL に以下を設定:

```
https://api.pushover.net/1/messages.json
```

**注意:** Sentry の Webhook は直接 Pushover API を呼べないため、
中間の Cloudflare Worker を使用する。

### 3. Pushover Relay Worker（推奨）

Sentry Webhook -> Cloudflare Worker -> Pushover API の構成:

```
Worker URL: https://sentry-pushover-relay.<your-domain>.workers.dev
```

Worker は Sentry の Webhook ペイロードを受け取り、
Pushover API 形式に変換して転送する。

**環境変数（Worker に設定）:**
- `PUSHOVER_USER_KEY`: Pushover ユーザーキー
- `PUSHOVER_API_TOKEN`: 上記で作成したアプリトークン

### 4. 動作確認

1. Sentry でテストイベントを送信
2. Pushover 通知が届くことを確認
3. urgent 優先度のテスト: Alert-2 または Alert-4 条件を手動トリガー

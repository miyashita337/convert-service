# Stripe E2E テスト環境セットアップ

## 前提条件

- Node.js 20+
- pnpm
- Stripe CLI (`brew install stripe/stripe-cli/stripe`)
- Playwright (`npx playwright install`)

## 1. Stripe CLI ログイン

```bash
stripe login
# ブラウザで認証 → "QuickConv Web サンドボックス" が表示されればOK
```

## 2. 環境変数の設定

### API（Cloudflare Workers ローカル）

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
# 各値を設定
```

### E2E テスト

```bash
cp apps/web/e2e/.env.example apps/web/e2e/.env
# 各値を設定
```

## 3. ローカルサーバー起動（3ターミナル）

### Terminal 1: Next.js

```bash
pnpm --filter web dev
# → http://localhost:3000
```

### Terminal 2: Cloudflare Workers

```bash
pnpm --filter api dev
# → http://localhost:8787
```

### Terminal 3: Stripe Webhook 転送

```bash
stripe listen --forward-to http://localhost:8787/webhook/stripe
# → whsec_xxx が表示される → apps/api/.dev.vars の STRIPE_WEBHOOK_SECRET に設定
```

## 4. E2E テスト実行

### ローカル

```bash
cd apps/web
npx playwright test --project=chromium
```

### ステージング

```bash
cd apps/web
E2E_TARGET=staging npx playwright test --project=production
```

### 本番

```bash
cd apps/web
E2E_TARGET=production npx playwright test --project=production
```

## 5. Stripe テストカード

| カード番号 | 用途 |
|---|---|
| `4242 4242 4242 4242` | 成功 |
| `4000 0000 0000 9995` | 残高不足（拒否） |
| `4000 0025 0000 3155` | 3Dセキュア認証必須 |

有効期限: 未来の任意の日付、CVC: 任意の3桁

## 6. Stripe CLI でイベント発火（Webhook テスト）

```bash
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.deleted
```

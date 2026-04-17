# デプロイコマンド

## ローカル開発
```bash
pnpm dev
```

## ビルド
```bash
pnpm build                                    # 全パッケージ
npx turbo build --filter=@quickconv/web       # フロントのみ
npx turbo build --filter=@quickconv/api       # APIのみ
```

## デプロイ（本番）

### 通常フロー（CIに任せる）

`main` への push で `.github/workflows/ci.yml` が以下を自動実行する:

1. `lint-and-build` / `test`
2. `deploy-stg` — Pages + Workers をステージングにデプロイ
3. `e2e-stg` — ステージング E2E（失敗すると本番デプロイをブロック）
4. `deploy-prod` — Pages + Workers を本番にデプロイ
5. `e2e-prod` — 本番 E2E スモーク
6. `notify` — 失敗時 Pushover 通知

通常のマージでは下記コマンドを手動実行する必要はない。

### 手動デプロイ（CIが落ちた / 緊急時のみ）

```bash
# API (Cloudflare Workers)
cd apps/api && npx wrangler deploy

# Frontend (Cloudflare Pages)
npx turbo build --filter=@quickconv/web
npx wrangler pages deploy apps/web/out --project-name quickconv-web

# Converter (GCP Cloud Run) — CI対象外、変更時のみ手動
gcloud builds submit --config=cloudbuild.yaml .
```

### D1 マイグレーション（本番）

**CI は D1 マイグレーションを適用しない。** スキーマ変更を含む PR をマージしたら、**本番デプロイ前** に必ず手動で適用する:

```bash
cd apps/api

# dry-run（適用内容を確認）
npx wrangler d1 migrations list quickconv-db --remote

# 本番適用
npx wrangler d1 migrations apply quickconv-db --remote
```

マイグレーション適用を忘れると `deploy-prod` 後の API で 500（テーブル不整合）が発生する。

### デプロイ後の動作確認

```bash
# ヘルスチェック
curl https://api.quickconv.cc/health

# 本番 E2E スモーク（CIが e2e-prod で自動実行するが、手動再実行する場合）
cd apps/web
E2E_TARGET=production E2E_BASE_URL=https://quickconv.cc \
  npx playwright test --project=production \
  e2e/deploy-check.spec.ts e2e/smoke.spec.ts
```

## ステージング環境

### 構成
| コンポーネント | 本番 | ステージング |
|---|---|---|
| Frontend | quickconv.cc | *.quickconv-web.pages.dev (プレビュー) |
| API | api.quickconv.cc | api-staging.quickconv.cc |
| DB | quickconv-db (D1) | quickconv-db-staging (D1) |
| Storage | quickconv-files (R2) | quickconv-files (R2, 共有) |
| Converter | Cloud Run | Cloud Run (共有) |

### 初回セットアップ

#### 1. D1 ステージングDB作成
```bash
npx wrangler d1 create quickconv-db-staging
```
作成後、出力された `database_id` を `apps/api/wrangler.toml` の `[env.staging.d1_databases]` セクションの `database_id` に設定する。

#### 2. マイグレーション適用
```bash
npx wrangler d1 migrations apply quickconv-db-staging --remote --env staging
```

#### 3. シークレット設定
```bash
# Google OAuth
npx wrangler secret put GOOGLE_CLIENT_ID --env staging
npx wrangler secret put GOOGLE_CLIENT_SECRET --env staging

# JWT
npx wrangler secret put JWT_SECRET --env staging

# Stripe (テストモードのキーを使用)
npx wrangler secret put STRIPE_SECRET_KEY --env staging
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env staging

# Sentry (任意)
npx wrangler secret put SENTRY_DSN --env staging
```

#### 4. Google OAuth リダイレクトURI追加
GCP Console > APIs & Credentials > OAuth 2.0 Client で以下を追加:
- `https://api-staging.quickconv.cc/auth/google/callback`

### デプロイ（ステージング）

```bash
# API
npx wrangler deploy --config apps/api/wrangler.toml --env staging

# Frontend (プレビューデプロイ)
cp apps/web/.env.staging apps/web/.env.production.local
npx turbo build --filter=@quickconv/web
npx wrangler pages deploy apps/web/out --project-name quickconv-web --branch staging
```

### 動作確認
```bash
# API ヘルスチェック
curl https://api-staging.quickconv.cc/health

# Workers dev URL でも確認可能
# https://quickconv-api-staging.<account>.workers.dev
```

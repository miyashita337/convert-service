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
```bash
# API (Cloudflare Workers)
npx wrangler deploy --config apps/api/wrangler.toml

# Frontend (Cloudflare Pages)
npx wrangler pages deploy apps/web/out --project-name quickconv-web

# Converter (GCP Cloud Run)
gcloud builds submit --config=cloudbuild.yaml .
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

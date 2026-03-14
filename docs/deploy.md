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

## デプロイ
```bash
# API (Cloudflare Workers)
npx wrangler deploy --config apps/api/wrangler.toml

# Frontend (Cloudflare Pages)
npx wrangler pages deploy apps/web/out --project-name quickconv-web

# Converter (GCP Cloud Run)
gcloud builds submit --config=cloudbuild.yaml .
```

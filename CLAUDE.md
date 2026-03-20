# QuickConv - CLAUDE.md

## 概要
オンライン画像変換サービス（quickconv.cc）。WebP/AVIF/HEIC特化。
詳細: [グランドデザイン](docs/GRAND_DESIGN.md) / [依存関係マップ](docs/DEPENDENCY_MAP.md)

## 技術スタック
- Frontend: Next.js (App Router, 静的エクスポート) + Tailwind + shadcn/ui → Cloudflare Pages
- API: Hono → Cloudflare Workers
- Converter: Sharp → GCP Cloud Run (us-central1)
- Storage: R2（24h自動削除） / DB: D1 / i18n: next-intl（ja/en）

## 開発フロー
1. Issue解析 → 2. **テスト作成（TDD）** → 3. 実装 → 4. E2Eテスト → 5. Push → 6. PR（`Closes #XX` 必須）
- **テストファースト必須**: 新機能・バグ修正は必ずテストから作成する。実装するたびにテストを増やす
- 並列開発: 別ブランチで作業。依存関係マップ参照
- AC検証: 競合（Convertio/iLoveIMG/TinyPNG）と同等動作を基準
- **着手時**: `gh issue edit <N> --add-label in-progress`（`in-progress` があれば他セッションが作業中）
- **PR マージ時**: GitHub Actions が `in-progress` を自動除去
- **デプロイ前**: `E2E_TARGET=production npx playwright test --project=production` を実行して本番チェック
- **D1マイグレーション**: 本番デプロイ時は `npx wrangler d1 migrations apply quickconv-db --remote` を忘れずに実行
- **並列エージェント活用**: 時間がかかるタスクや独立した作業は、マルチエージェント（Agent tool）で並列実行する。待機時間を最小化すること

## ビルド・デプロイ
詳細: [docs/deploy.md](docs/deploy.md)
```bash
pnpm dev          # ローカル開発
pnpm build        # 全パッケージビルド
```

## エピック・ロードマップ
詳細: [グランドデザイン](docs/GRAND_DESIGN.md)
ロードマップ: https://github.com/users/miyashita337/projects/2

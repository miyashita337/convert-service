# QuickConv - CLAUDE.md

## 概要
オンライン画像変換サービス（quickconv.cc）。WebP/AVIF/HEIC特化。
詳細: [グランドデザイン](docs/GRAND_DESIGN.md) / [依存関係マップ](docs/DEPENDENCY_MAP.md)

## 技術スタック
- Frontend: Next.js (App Router, 静的エクスポート) + Tailwind + shadcn/ui → Cloudflare Pages
- API: Hono → Cloudflare Workers
- Converter: Sharp → GCP Cloud Run (us-central1)
- Storage: R2（24h自動削除） / DB: D1 / i18n: next-intl（ja/en）

## Issue完了サイクル（BLOCKING — 全Issueで必須）
```
1. Issue着手 → gh issue edit <N> --add-label in-progress
2. テスト作成（TDD） → E2Eテストを先に書く
3. 実装（D1スキーマ変更時は apps/api/migrations/ にマイグレーション追加）
4. ローカルビルド・テスト確認（pnpm build && pnpm test）
5. Push → CI自動実行（lint / build / test / staging deploy）
6. PR作成（Closes #XX 必須）
7. コードレビュー対応 → レビューコメントに全件返信
8. ステージングE2E確認（CI e2e-stg ジョブ）→ PASSで本番デプロイを許可
9. PRマージ
10. 本番デプロイ:
   a. D1マイグレーション（スキーマ変更時のみ）: `npx wrangler d1 migrations apply quickconv-db --remote`
   b. Web（Pages）: CI自動デプロイ → 完了待ち
   c. API（Workers）: CI自動デプロイ → 完了待ち
   d. Converter（Cloud Run）: 変更時のみ手動 `gcloud builds submit --config=cloudbuild.yaml .`
11. 本番動作確認:
   a. ヘルスチェック: `curl https://api.quickconv.cc/health`
   b. 変更箇所の手動確認（ブラウザ or curl）
   c. 本番E2E確認（CI e2e-prod ジョブ、または手動 `E2E_TARGET=production npx playwright test --project=production`）
12. 全PASS → Issue完了
```
**ステップ8（staging E2E）と 11c（production E2E）の全PASSが受け入れ基準。スキップ不可。**
**D1スキーマ変更時は 10a を先に適用。テーブル不整合による 500 を防ぐため。**

## 開発ルール
- **テストファースト必須**: 新機能・バグ修正は必ずテストから作成する。実装するたびにテストを増やす
- **並列エージェント活用**: 時間がかかるタスクや独立した作業は、マルチエージェント（Agent tool）で並列実行する。待機時間を最小化すること
- 並列開発: 別ブランチで作業。依存関係マップ参照
- AC検証: 競合（Convertio/iLoveIMG/TinyPNG）と同等動作を基準
- **着手時**: `gh issue edit <N> --add-label in-progress`（`in-progress` があれば他セッションが作業中）
- **PR マージ時**: GitHub Actions が `in-progress` を自動除去
- **D1マイグレーション**: 本番デプロイ時は `npx wrangler d1 migrations apply quickconv-db --remote` を忘れずに実行

## ビルド・デプロイ
詳細: [docs/deploy.md](docs/deploy.md)
```bash
pnpm dev          # ローカル開発
pnpm build        # 全パッケージビルド
```

## エピック・ロードマップ
詳細: [グランドデザイン](docs/GRAND_DESIGN.md)
ロードマップ: https://github.com/users/miyashita337/projects/2

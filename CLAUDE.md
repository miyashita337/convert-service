# QuickConv - CLAUDE.md

## プロジェクト概要
オンライン画像変換サービス（quickconv.cc）。次世代画像フォーマット（WebP/AVIF/HEIC）特化。
ビジネス戦略・収益モデル・KPI・集客戦略は [グランドデザイン](docs/GRAND_DESIGN.md) を参照。

## 技術スタック
- Frontend: Next.js (App Router, 静的エクスポート) + Tailwind + shadcn/ui on Cloudflare Pages
- API: Hono on Cloudflare Workers
- Converter: Sharp on GCP Cloud Run (us-central1)
- Storage: Cloudflare R2（24h自動削除設定済み）
- DB: Cloudflare D1
- i18n: next-intl（日本語・英語）

## 開発運用方針

### 自律開発
- ユーザーに質問せず、AgentTeamsで自己解決して開発を進める
- ボトルネック時のみ Pushover通知（`bash ~/.claude/scripts/pushover-notify.sh`）でユーザーに連絡
- 「次どうしますか？」「これでいいですか？」と聞かない

### 並列開発
- 依存関係のないIssueはエージェントを並列起動してチーム開発する
- 各エージェントは別ブランチで作業（コンフリクト回避）
- 依存関係マップ: [docs/DEPENDENCY_MAP.md](docs/DEPENDENCY_MAP.md)

### 開発フロー（1 Issue あたり）
1. Issue解析: AC・依存関係を確認
2. 調査: 必要に応じて AgentTeams で技術調査
3. 実装: ブランチ作成 → コード実装
4. E2Eテスト: Playwright でACに基づくテストを作成・実行
5. Push: `git push origin <branch>`
6. PR作成: `Closes #XX` を**必ず**含める（ロードマップ自動連携）

### 優先順位
- 依存度が高い順 × 重要度が高い順
- ロードマップ: https://github.com/users/miyashita337/projects/2

### AC検証・E2Eテスト
- 各Issue実装完了時に、ACに基づいた **Playwright E2Eテスト** を作成・実行
- 正しさの基準: 競合サービス（Convertio/iLoveIMG/TinyPNG）と同等の動作ができること
- テストファイル: `apps/web/e2e/` 配下に配置
- PR作成前にテストがPASSすることを確認

### PRルール
- PR の body に `Closes #XX` を必ず含める
- PR マージ時に GitHub Actions が自動で Target date セット + Done に変更

## ビルド・デプロイ

```bash
# ローカル開発
pnpm dev

# ビルド
pnpm build                                    # 全パッケージ
npx turbo build --filter=@quickconv/web       # フロントのみ
npx turbo build --filter=@quickconv/api       # APIのみ

# デプロイ
npx wrangler deploy --config apps/api/wrangler.toml                    # API Workers
npx wrangler pages deploy apps/web/out --project-name quickconv-web    # Frontend Pages
gcloud builds submit --config=cloudbuild.yaml .                        # Converter Cloud Run
```

## エピック・ロードマップ
詳細は [グランドデザイン](docs/GRAND_DESIGN.md) および [依存関係マップ](docs/DEPENDENCY_MAP.md) を参照。

| 優先度 | エピック | Issue |
|---|---|---|
| 1 | E1: フリーミアム制限 | #8 (#14-#21) |
| 2 | E4: SEO + GA4 | #11 (#41-#50) |
| 3 | E2: AdSense | #9 (#22-#27) |
| 4 | E3: Stripe課金 | #10 (#28-#40) |
| 5 | E5: 初期集客 | #12 (#51-#59) |
| 6 | E6: 品質比較 | #13 (#60-#67) |
| 7 | E7: フォーマット拡張 | #68 |
| 8 | E8: エラー監視 | #69 (#70-#76) |

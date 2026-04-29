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
3. 実装（D1スキーマ変更時は apps/api/src/db/migrations/ にマイグレーション追加）
4. ローカルビルド・テスト確認（`pnpm build && cd apps/api && pnpm test` — 現状 test スクリプトは apps/api のみ）
5. Push → CI自動実行（lint / build / test / staging deploy）
6. PR作成（Closes #XX 必須）
7. コードレビュー対応 → レビューコメントに全件返信
8. ステージングE2E確認（CI e2e-stg ジョブ）→ PASSで本番デプロイを許可
9. PRマージ
10. 本番デプロイ:
   a. D1マイグレーション（スキーマ変更時のみ）: `cd apps/api && npx wrangler d1 migrations apply quickconv-db --remote`
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

## 責務分離: convert-service と team_salary

convert-service は **ファイル変換サービスに特化**。記事は `docs/articles/` に置いてよいが、note / Qiita / X / Threads / IG など SNS・ブログ投稿の実装は **`tools/team_salary` 配下を流用**する（重複実装禁止）。Dev.to / Hashnode 用の既存スクリプト (`tools/publish-{devto,hashnode}-*.mjs`) は legacy として convert-service に残置で OK。

詳細・流用元モジュール一覧・実行手順: [`docs/articles/README.md`](docs/articles/README.md)

## tools/team_salary 編集ルーチン（BLOCKING）
`tools/team_salary` は別リポ（github.com/miyashita337/team_salary）の submodule。convert-service 内から直接編集して親で commit すると submodule pointer のみ進み、実体の変更は team_salary 側に置き去りになる。**必ず以下の手順で team_salary 側に PR を作る**。

```bash
# 1. 編集セッション開始 (submodule 側で feature ブランチ作成)
cd tools/team_salary
git fetch origin && git checkout -B feat/<topic> origin/main

# 2. 編集 → commit → push → PR (team_salary 側)
# ... 編集 ...
git add <file>...                          # git add . は禁止
git commit -m "<conventional message>"
git push -u origin feat/<topic>
gh pr create --repo miyashita337/team_salary --base main \
  --title "..." --body "..."

# 3. PR merge 後、convert-service 側で submodule pointer を bump
cd ../..                                   # tools/team_salary から convert-service ルートへ戻る
bash scripts/bump-team-salary.sh           # submodule update --init --remote + commit
# 必要なら convert-service 側も PR 化して push
```

- **HTTPS push が HTTP 400 で失敗した場合**: `cd tools/team_salary && git config http.version HTTP/1.1` で回避（HTTP/2 chunked が GitHub と相性悪い既知問題）
- **自動投稿スクリプト等の WIP 退避**: 同じルーチンで `wip/<topic>` ブランチに commit & push して退避できる

## 環境変数 (.env) の前提

**Claude セッション開始時、以下の .env は既にセットアップ済みとして振る舞う。** 次回以降「API キーがない」「ハンドルが分からない」と聞かない。値が無効な場合のみ補正を依頼。機密情報（APIキーやパスワード等）をコードに直書きしない（README/CLAUDE.md/commit にも機密情報の値は残さない、変数名のみ）。

### convert-service ルート (`./.env`)
| 変数 | 用途 |
|---|---|
| `PRODUCT_KEY` | QuickConv API 課金キー (#285 API 課金ピボット関連) |
| `PUBLIC_KEY` | 同上、公開鍵 |
| `DEVTO_API_KEY` | Dev.to 記事投稿 (`tools/publish-devto-*.mjs`, `tools/update-devto-*.mjs`) |
| `HASHNODE_TOKEN` | Hashnode 記事投稿 (`tools/publish-hashnode-*.mjs`, `tools/update-hashnode-*.mjs`) |
| `HASHNODE_PUBLICATION_ID` | Hashnode publication slug (例: `quickconv-dev`) |

### team_salary submodule (`tools/team_salary/.env`)
SNS / 投稿系の認証情報を集約。詳細は `tools/team_salary/CLAUDE.md` の「note 投稿ワークフロー運用ルール」+ 各 SKILL 参照。

| 変数群 | 用途 |
|---|---|
| `NOTE_EMAIL` / `NOTE_PASSWORD` / `NOTE_USERNAME` | note (Playwright) |
| `X_USERNAME` / `X_PASSWORD` / `X_API_KEY` / `X_API_SECRET` / `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET` | X (Twitter) — API v2 + Playwright fallback |
| `IG_USERNAME` / `IG_PASSWORD` / `IG_ACCOUNT` / `IG_USER_ID` / `IG_ACCESS_TOKEN` | Instagram — Graph API + Playwright fallback |
| `THREADS_USER_ID` / `THREADS_ACCESS_TOKEN` / `THREADS_APP_ID` / `THREADS_APP_SECRET` | Threads API |
| `GOOGLE_AI_API_KEY` | Gemini 画像生成 |
| `QIITA_API_TOKEN` / `QIITA_USERNAME` | Qiita API |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` / `REDDIT_USERNAME` / `REDDIT_PASSWORD` | Reddit OAuth (現状空 — 投稿は手動運用なので未使用) |
| `HEADLESS` / `NODE_ENV` | Playwright / 実行モード |

### SNS アカウント識別子（記憶しておく）
- note: `quickconv` / Qiita: `quickconv` / Instagram: `quickconv` / X: `@quickconv`
- IG User ID: `17841444938496597` / Threads User ID: `34571263245822364`

### スクリプト実行時の env prefix（BLOCKING・RW-006）
note / SNS スクリプトを実行するときは必ず `.env` 経由で環境変数を load する。Keychain 直読みは macOS セキュリティ制約で 30s timeout する。
```bash
cd tools/team_salary
set -a && . ./.env && set +a && npx tsx scripts/<script>.ts
```

## エピック・ロードマップ
詳細: [グランドデザイン](docs/GRAND_DESIGN.md)
ロードマップ: https://github.com/users/miyashita337/projects/2

# QuickConv 記事ガイド

QuickConv の機能紹介・SEO 集客用記事と、その投稿フローのリファレンス。

## 記事の格納場所

```
docs/articles/
├── 001-tech-stack.md                   # 技術スタック紹介 (英語)
├── 002-format-comparison.md            # フォーマット比較 (日本語)
├── 003-claude-code-web-setup-hook.md   # Claude Code Cloud Sandbox の env 問題 (英語)
├── 004-webp-to-png.md                  # WebP→PNG How-to (日本語)
├── 005-mp4-to-mp3.md                   # MP4→MP3 How-to (日本語)
├── images/<NNN>-<slug>/                # 各記事のヘッダ画像・操作画像
└── README.md                           # 本ファイル
```

各記事の YAML frontmatter には以下のフィールドを持つ:

```yaml
title: "..."
description: "..."
tags: [...]
canonical_url: "" # 公開後にメインの URL を設定
cover_image: "./images/<NNN>-<slug>/header-*.png"
published: false
published_at: ""
platforms:        # 投稿先プラットフォームと公開後 URL
  hashnode: ""
  devto: ""
  medium: ""
  note: ""
  qiita: ""
  zenn: ""
```

## 責務分離（重要）

**convert-service** は **ファイル変換サービスに特化**。記事自体は資産として `docs/articles/` に置くが、SNS / ブログ投稿の実装は **`tools/team_salary` 配下を流用**する（重複実装禁止）。

- **convert-service 配下に置くもの**: 記事 (.md), 画像, 既存の Dev.to/Hashnode 投稿スクリプト
- **team_salary 配下から流用するもの**: note / Qiita / X / Threads / IG の投稿モジュール

## 投稿フロー

### 1. Dev.to / Hashnode（既存、convert-service 配下スクリプト）

英語記事のクロスポスト用に、convert-service/tools/ に per-article スクリプトを置いている。

| スクリプト | 対象記事 | 投稿先 |
|---|---|---|
| `tools/publish-devto.mjs` | 001-tech-stack | Dev.to |
| `tools/publish-hashnode.mjs` | 001-tech-stack | Hashnode |
| `tools/publish-devto-003.mjs` | 003-claude-code | Dev.to |
| `tools/publish-hashnode-003.mjs` | 003-claude-code | Hashnode |
| `tools/update-devto-003.mjs` | 003 既存記事更新 | Dev.to |
| `tools/update-hashnode-003.mjs` | 003 既存記事更新 | Hashnode |

実行例:

```bash
set -a && . .env && set +a
node tools/publish-devto-003.mjs
```

必要 env (`./.env`):
- `DEVTO_API_KEY`
- `HASHNODE_TOKEN`
- `HASHNODE_PUBLICATION_ID`

新しい記事 (004, 005) 用にも同パターンで追加可能。投稿先が同じならテンプレ流用で OK。

### 2. note / Qiita / X / Threads / IG（team_salary モジュール流用）

日本語消費者向け記事の note 投稿、Qiita クロス投稿、X 拡散など。**実装は team_salary 配下**にあり、再実装しない。

| 投稿先 | 流用元モジュール | 備考 |
|---|---|---|
| note | `tools/team_salary/src/automation/playwright/note-poster.ts` | Playwright、`publishStatus: "draft"` 対応 |
| Qiita | `tools/team_salary/src/automation/api/qiita-poster.ts` | REST API、`canonical_url` 設定可 |
| X (Twitter) | `tools/team_salary/src/automation/sns/x-share.ts` | API v2 優先 + Playwright fallback (RW-005) |
| X (低レベル) | `tools/team_salary/src/automation/api/x-api-poster.ts`, `playwright/x-poster.ts` | x-share の内部で使用 |
| Threads | `tools/team_salary/src/automation/api/threads-api-poster.ts` | Threads API |
| Instagram | `tools/team_salary/src/automation/api/instagram-api-poster.ts` | Graph API + Playwright fallback |

必要 env は `tools/team_salary/.env` 側に集約 (`NOTE_*`, `QIITA_API_TOKEN`, `X_*`, `THREADS_*`, `IG_*` 等)。詳細は CLAUDE.md「環境変数 (.env) の前提」セクション参照。

実行時は **team_salary 配下から起動**する（env load の都合）:

```bash
cd tools/team_salary
set -a && . ./.env && set +a
npx tsx scripts/<your-publish-script>.ts
```

### 3. team_salary モジュールに修正を入れる場合

`note-poster.ts` などに変更が必要なら、**convert-service 内から直接編集してはいけない**（submodule pointer のみ進み、本体未反映になる）。

**必ず team_salary 側に PR を作る**。手順は CLAUDE.md「tools/team_salary 編集ルーチン (BLOCKING)」参照:

```bash
cd tools/team_salary
git fetch origin && git checkout -B feat/<topic> origin/main
# 編集 → commit → push → PR
gh pr create --repo miyashita337/team_salary --base main \
  --title "..." --body "..."
# merge 後、convert-service 側で submodule pointer bump
cd ../..
bash scripts/bump-team-salary.sh
```

## 関連 Issue / 追跡

- #225 E11 集客・グロース施策（Phase 3）
- #304 投稿: 005 (MP4→MP3) note/Qiita/X 展開
- #305 投稿: 004 (WebP→PNG) note/Qiita/X 展開

## 関連ドキュメント

- 親 README: [`/README.md`](../../README.md)
- プロジェクト全体: [`/CLAUDE.md`](../../CLAUDE.md)
- グランドデザイン: [`/docs/GRAND_DESIGN.md`](../GRAND_DESIGN.md)
- team_salary 編集ルール: `/CLAUDE.md`「tools/team_salary 編集ルーチン (BLOCKING)」セクション

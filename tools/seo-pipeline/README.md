# SEO Pipeline — MVP

QuickConv SEO 集客自動化 (Epic #320) の MVP パイプライン。

## モジュール一覧

| ファイル                          | Issue       | 役割                                                              |
| --------------------------------- | ----------- | ----------------------------------------------------------------- |
| `keyword-research.mjs`            | #323        | キーワード選定 (Search Console + 手動 seed)                       |
| `competitor-analysis.mjs`         | #324        | 競合分析 (H2/H3 抽出 + Prompt Injection バリア)                   |
| `outline-generator.mjs`           | #325        | 構成案生成 (deterministic、template-based)                        |
| `run.mjs`                         | #325        | 3段オーケストレーター (keyword → competitor → outline)            |
| `publish-draft.mjs`               | #326 / #330 | note/Qiita 下書き shim + XSS サニタイズゲート + `--update` モード |
| `benchmark.mjs`                   | #330        | 記事ベンチマーク計測 (Sharp / ffmpeg、median of 5 trials)         |
| `render-article-003-diagrams.mjs` | #330        | 003 記事用の SVG → PNG 図版レンダリング                           |

## keyword-research.mjs

### 使い方

```bash
# 最小実行 (手動 seed のみ)
node tools/seo-pipeline/keyword-research.mjs --seed "WebP 変換"

# 複数 seed + 出力先指定
node tools/seo-pipeline/keyword-research.mjs --seed "WebP 変換" --seed "AVIF 変換" --out docs/articles/seo-drafts

# dry-run (ファイル書き出さず stdout に JSON 出力)
node tools/seo-pipeline/keyword-research.mjs --seed "WebP 変換" --dry-run
```

### 出力スキーマ

```jsonc
{
  "version": "1",
  "generated_at": "2026-05-13T01:23:45.000Z",
  "meta": {
    "fallback": true,           // Search Console 認証エラー時 true
    "seeds": ["WebP 変換"],
    "source": "search-console" | "manual-seed",
    "warning": "..."            // フォールバック理由 (任意)
  },
  "keywords": [
    {
      "keyword": "WebP 変換",
      "score": 0,
      "source": "seed" | "expansion" | "search-console",
      "search_volume": null,    // GSC データある場合のみ
      "ctr": null               // GSC データある場合のみ
    }
  ]
}
```

### Search Console API 設定 (任意)

`.env.seo.example` をコピーして `.env.seo` を作成し、Google Cloud Console で OAuth クライアントを発行:

```bash
cp tools/seo-pipeline/.env.seo.example tools/seo-pipeline/.env.seo
# 編集して GSC_OAUTH_CLIENT_ID / SECRET / REFRESH_TOKEN / SITE_URL を設定
```

未設定または認証エラー時は手動 seed のみで動作続行 (`meta.fallback=true`)。

### セキュリティ

- `.env.seo` は `.gitignore` 対象 (リポ追加禁止)
- `tools/team_salary/.env` とは分離 (RW-014 教訓)
- ログには認証情報をマスク表示 (`maskSecret`)

### テスト

```bash
node --test tools/seo-pipeline/__tests__/keyword-research.test.mjs
```

### 関連 RW

- RW-014: `.env.seo` 分離で広域 deny 巻き込みを未然回避
- RW-037: subagent 起動原則 (本 CLI は subagent 起動を強制しない)
- RW-021: 壊れた関数呼び出し / ハードコード回避 (CLI 引数で seed 受取)

## competitor-analysis.mjs

### 使い方

```bash
# 個別 URL を指定
node tools/seo-pipeline/competitor-analysis.mjs \
  --keyword "WebP 変換" \
  --url https://example.com/article1 \
  --url https://other.com/post

# URL リストファイル経由
node tools/seo-pipeline/competitor-analysis.mjs \
  --keyword "WebP 変換" \
  --urls-from urls.txt
```

### 出力スキーマ

```jsonc
{
  "version": "1",
  "generated_at": "2026-05-13T01:23:45.000Z",
  "meta": {
    "keyword": "WebP 変換",
    "url_count": 5,
    "sandbox_applied": true,        // 必ず true (Prompt Injection 防御適用)
    "source": "manual-urls"
  },
  "competitive_analysis": [
    {
      "url": "https://...",
      "title": "Sanitized title",
      "headings": [
        { "level": 2, "text": "..." },
        { "level": 3, "text": "..." }
      ],
      "fetched_at": "...",
      "status": "ok" | "error",
      "error": null
    }
  ]
}
```

### Prompt Injection 防御設計

- **タグ完全除去**: heading 内部の HTML タグ (`<SYSTEM>`, `<script>` 含む) は regex で全て除去
- **`<` `>` 単独文字も削除**: 万一残存しても下流 prompt 命令として解釈不能化
- **HTML entity decode 後の再エスケープなし**: 単純な printable text のみ残す
- **構造化 JSON のみ下流に渡す**: 上流エージェントは `JSON.parse` 経由で文字列値として受け取るため、命令注入不可
- **本スクリプトは LLM を呼ばない**: HTML fetch + 正規表現抽出のみ、tool use 不要のサンドボックス設計

### レート制限

- 同一ドメインへの並列リクエスト: 最大 1 (逐次)
- リクエスト間: `minDelayMs` (default 500ms)
- HTTP timeout: 10s
- レスポンスサイズ上限: 2MB

## run.mjs (3 段オーケストレーター)

### 使い方

```bash
# 単純 (URLなし、競合分析スキップ)
node tools/seo-pipeline/run.mjs --keyword "WebP 変換"

# 競合 URL 込み
node tools/seo-pipeline/run.mjs --keyword "WebP 変換" \
  --url https://example.com/article1 \
  --url https://other.com/post

# URL リストファイル
node tools/seo-pipeline/run.mjs --keyword "WebP 変換" --urls-from competitors.txt

# 予算 cap
MAX_CLAUDE_TOKENS_PER_RUN=10000 node tools/seo-pipeline/run.mjs --keyword "WebP 変換"
```

### 実行順序

1. `keyword-research.mjs --seed <keyword>` → `keywords.json`
2. `competitor-analysis.mjs --keyword <keyword> --url ...` → `competitive_analysis.json` (URL なければスキップ + 警告)
3. `outline-generator.mjs --keyword <keyword> --keywords-file ... --competitor-file ...` → `outline.md`

### 予算 cap (MAX_CLAUDE_TOKENS_PER_RUN)

- outline-generator の出力サイズ (token 推定) が cap を超えると exit 1
- exit 時に `~/.claude/scripts/pushover-notify.sh` を best-effort で呼ぶ
- cap は日本語=chars/2、英語のみ=chars/4 で推定 (簡易)

## outline-generator.mjs

### 使い方

```bash
node tools/seo-pipeline/outline-generator.mjs \
  --keyword "WebP 変換" \
  --keywords-file docs/articles/seo-drafts/2026-05-13/keywords.json \
  --competitor-file docs/articles/seo-drafts/2026-05-13/competitive_analysis.json
```

### 設計判断

- **deterministic (LLM 不要)**: keywords + competitor のマージで構成案を組み立てる。後続で LLM polish を入れる余地あり
- **競合 H2 を頻度順にマージ**: 複数競合で言及される観点を上位に
- **常に QuickConv セクションを含む**: 競合データが空でも QuickConv 実例セクションを必ず挿入
- **TODO マーカー**: 実機スクショ・ベンチマーク値などは TODO で明記、Phase 2 で人間が埋める

## publish-draft.mjs

### 使い方

```bash
# 既定 (dry-run、サニタイズ後の payload を stdout)
node tools/seo-pipeline/publish-draft.mjs --article docs/articles/006-new.md

# 実 publish (Qiita のみ、要 tools/team_salary/.env の QIITA_API_TOKEN)
node tools/seo-pipeline/publish-draft.mjs \
  --article docs/articles/006-new.md \
  --publish --target qiita --note-url https://note.com/x

# 明示 dry-run (--publish を後付で外したい場合)
node tools/seo-pipeline/publish-draft.mjs --article ... --dry-run
```

### セキュリティ設計

- **HITL デフォルト draft (RW-002)**: `--publish` 明示なしでは自動的に dry-run、API 呼び出しなし
- **XSS サニタイズゲート**: `<script>` `<iframe>` `<object>` `<embed>` `<applet>` `<style>` `<link>` `<meta>` 完全除去、`on*=` イベントハンドラ属性除去、`javascript:` URL 無害化 (`blocked-js:` に置換)
- **env 分離 (RW-014)**: 本 shim は `.env.seo` を参照。`tools/team_salary/.env` は team_salary 側サブプロセスのみ load
- **team_salary は spawn 経由**: 既存 `publish-quickconv-qiita.ts` を子プロセスで呼ぶ。submodule 直接編集は禁止 (CLAUDE.md の編集ルーチン尊重)

### 既知の制限

- **note publish の shim 未実装**: 現状 `--target note` は警告メッセージのみ。手動で `tools/team_salary` 側の note 投稿スクリプト (`publish-articles.ts` 等) を直接実行する運用
- **DOMPurify 未統合**: MVP では regex ベースサニタイザで対応。Markdown ソースが人間執筆である前提のため十分。完全な HTML 入力を扱う場合は `isomorphic-dompurify` 統合検討
- **AC-1 (実機投稿) は credentials 必須**: CI E2E では実投稿しない。手動 / one-off 検証で確認

### `--update` モード (Issue #330 AC-3)

既存 Qiita 記事を更新するための準備モード。frontmatter から `platforms.qiita` URL を読んで Qiita API `PATCH /api/v2/items/:id` のリクエストを組み立てる。

```bash
# dry-run (リクエスト内容を JSON で表示。API は呼ばない)
node tools/seo-pipeline/publish-draft.mjs \
  --article docs/articles/004-webp-to-png.md \
  --update --target qiita --dry-run
```

設計判断:

- `--update` 時は **`private` フィールドを送らない**: 既存記事が published なら public を維持、draft なら draft を維持。送ると Qiita 側は値で上書きするため、意図しない unpublish を起こさない conservative 動作
- 実 PATCH (`--update --publish`) は本 PR 時点で意図的に未実装。dry-run で内容を確認 → 人間が手動で `curl -X PATCH` する HITL ゲート (RW-002 教訓)
- note は API 経由更新ができない (Playwright が必要) ため、`--target note` 時は `ok=false` で「team_salary 側手動更新」を示す
- 5 記事に対する dry-run 動作確認: `node tools/seo-pipeline/publish-draft.mjs --article docs/articles/004-webp-to-png.md --update --target qiita --dry-run | jq '.requests[0] | {ok, item_id, body: (.body | {title, tag_count: (.tags|length)})}'`

## benchmark.mjs (Issue #330 AC-2)

記事 003 / 004 / 005 用の変換時間ベンチを 5 回の median で計測。本番 API の rate limit (10/日) を避けつつ、production converter と同じ Sharp 0.33 / ffmpeg 8.x を直接叩く設計。

```bash
node tools/seo-pipeline/benchmark.mjs            # docs/articles/benchmarks/<date>.json に書き出し
node tools/seo-pipeline/benchmark.mjs --dry-run  # stdout のみ
```

依存: `apps/converter` 配下に sharp が pnpm install で展開されていること (workspace dependency)。`pnpm install` を repo root で 1 回実行すればよい。

計測ペア:

- WebP → PNG (800x600 / 3000x2000)
- JPEG → WebP q80 (small / medium)
- JPEG → AVIF q65 (small / medium)
- MP4 → MP3 (libmp3lame VBR `-q:a 2`)

## retrospective.mjs (Issue #327 / Epic #320 Sub 7)

MVP パイプライン 2 週間運用後の **撤退基準** 5 指標を集計し、継続 / Phase2 / 廃止の判定を出す。判断結果は [`docs/adr/007-seo-pipeline-mvp-retrospective.md`](../../docs/adr/007-seo-pipeline-mvp-retrospective.md)。

```bash
# 機械集計のみ (生成成功率・ビルド破壊件数)
node tools/seo-pipeline/retrospective.mjs --since 2026-05-13

# 外部コンソール依存指標を手動入力して全 5 指標を確定
node tools/seo-pipeline/retrospective.mjs --since 2026-05-13 \
  --claude-cost-yen 0 --indexed-count 0 [--hitl-approved 1 --hitl-total 2] [--json]
```

| 指標                 | 集計元                                                   | 機械/手動           |
| -------------------- | -------------------------------------------------------- | ------------------- |
| 記事生成成功率       | `docs/articles/seo-drafts/<date>/outline.md` の生成率    | 機械                |
| HITL 承認率          | `--hitl-approved` / `--hitl-total`                       | 手動 (機械ログ不在) |
| Claude API 料金      | `--claude-cost-yen` (Anthropic Console)                  | 手動                |
| ビルド破壊件数       | `gh run list --workflow CI` 失敗のうち seo-pipeline 起因 | 機械                |
| 生成記事インデックス | `--indexed-count` (Search Console)                       | 手動                |

- 外部コンソール依存・機械ログ不在の指標は推測で 0 を埋めず `未計測` を明示する (サイレントフォールバック禁止)
- ADR-006 §3 ルール: 1 指標でも breach → `廃止` / 全 PASS かつ全計測 → `Phase2` / breach なしだが未計測あり → `判定不能`
- テスト: `node --test tools/seo-pipeline/__tests__/retrospective.test.mjs`

> **注記 (2026-06-13)**: 本ツールの初回集計で生成パイプライン (`run.mjs` / `keyword-research.mjs` / `competitor-analysis.mjs` / `outline-generator.mjs`) の **廃止** が決定 (ADR-007)。実削除は別 PR。`benchmark.mjs` / `publish-draft.mjs` (`--update`) / `render-article-003-diagrams.mjs` は記事メンテナンスツールとして保持。

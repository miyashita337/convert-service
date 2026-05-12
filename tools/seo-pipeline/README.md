# SEO Pipeline — MVP

QuickConv SEO 集客自動化 (Epic #320) の MVP パイプライン。

## モジュール一覧

| ファイル | Issue | 役割 |
|---|---|---|
| `keyword-research.mjs` | #323 | キーワード選定 (Search Console + 手動 seed) |
| `competitor-analysis.mjs` | #324 | 競合分析 (H2/H3 抽出 + Prompt Injection バリア) |
| `outline-generator.mjs` | #325 | 構成案生成 (deterministic、template-based) |
| `run.mjs` | #325 | 3段オーケストレーター (keyword → competitor → outline) |
| `publish-draft.mjs` | #326 | note/Qiita 下書き shim + XSS サニタイズゲート |

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


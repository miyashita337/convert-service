# SEO Pipeline — MVP

QuickConv SEO 集客自動化 (Epic #320) の MVP パイプライン。

## モジュール一覧

| ファイル | Issue | 役割 |
|---|---|---|
| `keyword-research.mjs` | #323 | キーワード選定 (Search Console + 手動 seed) |
| `competitor-analysis.mjs` | #324 | 競合分析 (H2/H3 抽出 + Prompt Injection バリア) |
| (未実装) `outline.mjs` | #325 | 構成案生成 + 3段オーケストレーター |
| (未実装) `publish-draft.mjs` | #326 | note/Qiita 下書き接続 + DOMPurify |

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


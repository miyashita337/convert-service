# Hacker News "Show HN" ドラフト（会長 手動投稿用 / Issue #236）

> **このファイルが Show HN 投稿の正準ドラフト**です。会長はここからタイトル・本文・リンクをそのまま copy-paste して投稿できます。
> **実投稿は会長が手動で実施**（外部公開・不可逆。部署セッションは HN へ投稿しません）。
> 投稿当日のインフラ pre-bump / バズ対応の詳細 runbook は memory `project_show_hn_preflight.md` を参照。

- 投稿先: https://news.ycombinator.com/submit
- Story URL（投稿欄に入れる URL）: `https://quickconv.cc`
- 製品状態: **本番完全動作中**（フロント / API / 変換 / 課金すべて稼働）。投稿前チェックリストで完動を再確認すること。

---

## 1. タイトル案（AC-1）

いずれも `Show HN: QuickConv – <差別化ポイント>` 形式、80 文字以内（HN タイトル上限）。HN ルール上、タイトルに価格・宣伝文句は入れない。

### Option A — アーキテクチャ強調（**推奨**）
```
Show HN: QuickConv – WebP/AVIF/HEIC converter on Cloudflare Workers + Cloud Run
```

### Option B — UX 強調（品質比較プレビュー）
```
Show HN: QuickConv – Next-gen image converter with side-by-side quality preview
```

### Option C — 無登録強調（コスト好奇心を引く）
```
Show HN: QuickConv – No-signup converter for WebP, AVIF and HEIC
```

> **推奨: Option A**
> #236 は「技術的深さの訴求」を要件にしており、HN は serverless 構成・コスト最適化の議論に最も反応する。本文の architecture セクションへ自然に橋渡しできる。
> 「near-zero cost をどう実現したか」のコスト好奇心を狙うなら Option C も有効（前回 preflight の第一候補）。UX で勝負するなら B。

---

## 2. 本文ドラフト（AC-2 / 投稿直後の first comment に貼る）

> Show HN は Story URL のみで投稿し、本文は投稿直後に作者コメントとして付けるのが慣例。以下をそのまま first comment に貼る。
> 数値はすべて実測・実装ベース（出典は §5）。HN コメンターの突っ込みに耐える正確性を優先している。

```
Hi HN, author here.

QuickConv (https://quickconv.cc) is a browser-based image converter focused on
next-gen formats — WebP, AVIF, and HEIC — plus the traditional JPG/PNG on both
the input *and* output side. No sign-up, files auto-delete after 24h. It's fully
live: frontend, API, the conversion pipeline, and billing are all in production.

Why I built it
I kept hitting paywalls or upload caps on existing tools just to convert a handful
of HEIC photos off my iPhone. Most converters treat these modern formats as an
afterthought. I wanted something fast, private, and free for casual use.

Architecture (this is the part I'd love feedback on)
- Static frontend: Next.js (static export) on Cloudflare Pages
- API: Hono on Cloudflare Workers — auth, rate limiting, job orchestration
- Converter: Sharp / libvips on GCP Cloud Run — the actual pixel crunching
- Storage: R2 with a lifecycle rule that auto-deletes objects after 24h (no egress fees)

The Workers/Cloud Run split lets the always-on edge layer (auth, rate limiting)
run on Cloudflare's free tier while the CPU-heavy converter scales to zero on
Cloud Run when idle. Cold starts on Cloud Run were the main tradeoff — I keep
max-instances low and eat the occasional ~2s cold start in exchange for ~$0 idle
cost. Monthly infra bill is effectively zero at current traffic.

Real conversion numbers (local Sharp 0.33.5, median of 5, warm-up discarded;
network/queue not included)
- JPEG -> WebP q80, 800x600 (~19KB):    24 ms
- JPEG -> WebP q80, 3000x2000 (~158KB): 289 ms
- WebP -> PNG, 3000x2000 (~47KB):       105 ms
- JPEG -> AVIF q65, 3000x2000 (~158KB): 3.8 s   <- AVIF encode is the expensive one
WebP/PNG conversions are sub-300ms even for large photos; upload time dominates.
AVIF is much heavier on CPU, which is exactly why scaling the converter
separately on Cloud Run mattered.

Quality comparison preview
After converting, you can drag a slider to compare original vs converted side by
side — handy for dialing in AVIF/WebP quality without guessing.

Developer API
There's a REST API for the same pipeline (Bearer key with a `qc_` prefix, grab one
at https://quickconv.cc/developers). Flat monthly plans instead of per-request
metering, so cost is predictable: Starter ¥980/mo (~$6, 50MB/file) and
Pro ¥4,980/mo (~$32, 100MB/file). The pitch for developers is simple +
affordable + next-gen-focused: a small, honest converter endpoint when you don't
want to wire up libvips/ffmpeg yourself or pay per-call enterprise pricing.

Limits & pricing (web)
Free: 10 conversions/day, 10MB/file, batch up to 3. Paid consumer plans start at
¥380/month (~$2.5) for heavier use.

i18n
next-intl with ja/en — built for Japanese users first, since HEIC (the iPhone
default) is especially common there.

Feedback I'm after: UX, conversion quality, anything broken, whether the pricing
makes sense, and the Workers + Cloud Run split. Happy to go deep on the
architecture in the comments.
```

### 想定 Q&A（コメント返信用ストック）

- **「JPG/PNG への変換はないのか？」**
  > We support JPG/PNG as both input *and* output. The focus is converting them into next-gen formats (WebP/AVIF/HEIC) and back to JPG/PNG when wider compatibility is needed — we're closing the tooling gap on AVIF/HEIC, not dropping the classics.
- **「near-zero cost と言うが本当の月額は？」**
  > Cloudflare Workers free tier covers the API layer; Cloud Run scales to zero when idle; R2 has no egress fees. At current traffic the bill rounds to $0 — the main variable cost is Cloud Run CPU-seconds during AVIF encodes.
- **「バズったら落ちないか？（Cloud Run max-instances）」**
  > 投稿前に max-instances を 1→5 に bump 予定（runbook 参照）。front page 入りしたら Cloud Run の scale 状況と Sentry を監視。

---

## 3. UTM 付き着地リンク（AC-3）

repo の UTM 正準体系（`docs/utm-design.md`）に従う:

```
https://quickconv.cc/?utm_source=hackernews&utm_medium=social&utm_campaign=launch
```

- **Story URL は UTM なしのクリーン URL（`https://quickconv.cc`）で投稿**するのが Show HN の作法。上の UTM リンクは **first comment 内のリンクや他チャネルへのクロスポスト計測**に使う。
- GA4「トラフィック獲得」で `utm_source=hackernews / utm_medium=social` として分類される。
- 注: Issue #236 本文の例 `utm_medium=show-hn` は repo 既定の UTM 体系（`docs/utm-design.md`）と不整合なため、正準形 `utm_medium=social&utm_campaign=launch` を採用した。

---

## 4. 投稿前チェックリスト（AC-4）

### 投稿タイミング
- [ ] **月曜または火曜、US 東部時間 09:00–12:00**（= JST 月/火 22:00–翌 01:00）に投稿。HN viewer のピーク帯。
- [ ] 投稿は手動（HN は自律投稿不可）。

### 製品 / API 完動確認（コマンドで決定的に確認）
- [ ] フロント 200:
  ```bash
  curl -sI https://quickconv.cc/ | head -1            # → HTTP/2 200
  ```
- [ ] API ヘルスチェック:
  ```bash
  curl -s https://api.quickconv.cc/health             # → {"status":"ok",...}
  ```
- [ ] 課金 LP 表示:
  ```bash
  curl -sI https://quickconv.cc/pricing | head -1     # → HTTP/2 200
  ```
- [ ] Stripe Checkout エンドポイント存在:
  ```bash
  curl -sI https://api.quickconv.cc/billing/checkout | head -1   # → 405 (endpoint exists, POST 待ち)
  ```
- [ ] 変換の目視確認: ブラウザで小さい HEIC/JPG → WebP を 1 件実行し、ダウンロードできること。
- [ ] 品質比較プレビューのスライダーが動作すること。

### インフラ pre-bump（runbook より）
- [ ] Cloud Run `max-instances` を 1→5 に拡張（バズ時の同時変換 503 防止）。**T+48h で 1 に戻す**。
  ```bash
  gcloud run services update quickconv-converter --region=us-central1 \
    --project=quickconv-489717 --max-instances=5
  ```

### HN 投稿マナー
- [ ] タイトルに価格・宣伝文句を入れない（HN ルール）。
- [ ] 投稿直後（30 秒以内）に first comment（§2 本文）を投下。
- [ ] 最初の 1 時間は HN を監視し、全コメントに丁寧に即レス。批判にも defensive にならない。
- [ ] upvote 依頼はしない（spam 判定リスク）。
- [ ] リンクは原則 `https://quickconv.cc` のみ（複数リンクは spam 警戒）。

### 投稿後（参考）
- [ ] 投稿 URL（`https://news.ycombinator.com/item?id=XXXXXXXX`）を控える。
- [ ] バズ対応・流入計測・後始末の詳細は memory `project_show_hn_preflight.md` の T+5分〜T+48h 手順に従う。

---

## 5. 数値・実装の出典（fact-check）

| 主張 | 出典 |
|---|---|
| JPG→WebP 24ms（800×600）/ 289ms（3000×2000）、AVIF 3.8s、WebP→PNG 105ms | `docs/articles/benchmarks/2026-05-17.json`（Sharp 0.33.5, median of 5, warm-up 除外） |
| API プラン Starter ¥980/mo・Pro ¥4,980/mo | `packages/shared/src/constants/stripe.ts:101-114`（LIVE Price, #357） |
| API ファイルサイズ上限 free 10MB / Starter 50MB / Pro 100MB | `apps/api/src/routes/v1-convert.ts:11-13` |
| API キー Bearer `qc_` prefix / `/developers` で取得 | `docs/openapi.yaml`（securitySchemes ApiKeyAuth） |
| 消費者 Free: 10回/日・10MB・batch 3 / 有料 ¥380/月〜 | memory `MEMORY.md`（収益モデル） |
| UTM 体系（hackernews/social/launch） | `docs/utm-design.md` |

> **重要な訂正**: Issue #236 本文は「JPG→WebP 4.4s〜11.0s」と記載していたが、実測データ（上記 JSON）では **JPG→WebP は 24ms〜289ms**。4.4s〜11.0s は実測と矛盾するため採用せず、実測値に置き換えた（遅いのは AVIF エンコードで ~3.8s）。HN コメンターの検証に耐えるため正確な値を使用。

# Hacker News "Show HN" ドラフト

URL: https://quickconv.cc

---

## タイトル案（3パターン）

### Option A — 技術スタック強調
```
Show HN: QuickConv – WebP/AVIF/HEIC converter running on Cloudflare Workers + GCP Cloud Run for ~$0/month
```

### Option B — ユーザー価値強調（シンプル）
```
Show HN: QuickConv – Next-gen image format converter with side-by-side quality preview
```

### Option C — ゼロコスト運用 + 無登録強調（HN受けしやすい）
```
Show HN: QuickConv – Free WebP/AVIF/HEIC converter, no sign-up, built on serverless for near-zero infra cost
```

> **推奨**: **Option C**
> HNコミュニティは「no sign-up」「free」「how did you keep costs near zero」に反応しやすい。技術的なコスト最適化の話題はコメントを引き出しやすい。

---

## 本文（コメント）英語ドラフト

```
Hi HN,

I built QuickConv (https://quickconv.cc) – a browser-based image converter focused on next-gen formats: WebP, AVIF, and HEIC. No sign-up required.

**Why I built it**
I kept hitting paywalls or upload limits on existing tools just to convert a handful of HEIC photos from my iPhone. Most converters treat these modern formats as an afterthought. I wanted something fast, private (files auto-delete after 24h), and free for casual use.

**What's technically interesting**

- **Conversion pipeline**: Next.js (static export) → Cloudflare Pages → Hono API on Cloudflare Workers → Sharp on GCP Cloud Run. Workers handle auth/rate-limiting; Cloud Run does the actual pixel-crunching. Cold starts on Cloud Run were the biggest pain point – I mitigated it by keeping max-instances=1 and accepting the occasional ~2s cold start for the tradeoff of zero idle cost.

- **Near-zero infra cost**: Cloudflare Workers free tier handles the API layer. GCP Cloud Run scales to zero when idle. R2 stores files with a lifecycle rule that auto-deletes after 24h (no egress fees). Monthly bill: effectively $0 for current traffic.

- **Quality comparison preview**: After conversion, users can drag a slider to compare the original and converted image side by side. Useful for tuning AVIF quality settings without guessing.

- **i18n from day one**: next-intl with ja/en. Building for Japanese users first since HEIC (iPhone default) is especially prevalent there.

**Limits & pricing**
Free tier: 10 conversions/day, 10MB/file, batch up to 3 images.
Paid plans start at ¥380/month (~$2.50) for heavier use.

I'd love feedback on: UX, conversion quality, anything broken, or whether the pricing makes sense. Happy to go deep on the architecture if anyone's curious.
```

---

## 投稿チェックリスト

- [ ] HNアカウントのカルマが十分あるか確認（新アカウントはShow HNが埋もれやすい）
- [ ] 投稿タイミング: 月〜火曜の US東部時間 9:00-11:00 が最も閲覧数が多い
- [ ] 投稿直後は自分でコメントに追記しない（スパム判定リスク）
- [ ] 最初の1時間はHNを監視してコメントに即レスする
- [ ] 「Ask HN」と「Show HN」の混同に注意（Show HNが正しい）
- [ ] タイトルに価格・マーケティング文句を入れない（HNルール）

---

## 補足メモ

- HNでバズったあとはサーバー負荷急増に注意。Cloudflare Workers + Cloud Run (max-instances=1) のため、同時接続が多いと Cloud Run のスケールアップが追いつかない可能性あり。投稿前に max-instances を一時的に上げることを検討。
- コメントで「JPEG/PNG への変換はないのか」と聞かれる可能性がある。回答案: "We support JPG/PNG as input *and* output — the focus is converting them into next-gen formats like WebP/AVIF, and back to JPG/PNG when wider compatibility is needed. We're closing the gap in AVIF/HEIC tooling."
- Stripe 決済の動作確認を投稿前に必ず完了させること（Issue #262）。

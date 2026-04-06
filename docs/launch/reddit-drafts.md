# Reddit ローンチ投稿ドラフト

作成日: 2026-04-05
サービス: QuickConv (https://quickconv.cc)

---

## 1. r/webdev

**タイトル:**
> I built an image converter SaaS running at ~$0/month on Cloudflare's free tier — here's the stack

**本文:**

Been tinkering on this for a few months and finally launched it: [QuickConv](https://quickconv.cc) — a WebP/AVIF/HEIC image converter focused on next-gen formats.

The interesting part (for this sub at least) is the architecture, because I was determined to keep monthly costs near zero.

**Stack:**

| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router, static export) → Cloudflare Pages |
| API | Hono → Cloudflare Workers |
| Conversion engine | Sharp → GCP Cloud Run (us-central1, max-instances=1) |
| Storage | Cloudflare R2 (24h auto-delete) |
| DB | Cloudflare D1 |
| i18n | next-intl (ja/en) |
| Payments | Stripe |

**Why Cloudflare for almost everything?**

- Pages + Workers + R2 + D1 all have generous free tiers
- R2 has no egress fees, which matters a lot when you're serving converted image files
- Workers cold-start latency is negligible compared to the actual Sharp conversion time

**The one non-free piece:** GCP Cloud Run for the actual Sharp processing. Sharp doesn't run well in a Worker (WASM constraints), so I isolated it on Cloud Run with `max-instances=1` to cap costs. Even with usage it stays within the free tier most months.

**What it does:**

- WebP ↔ AVIF ↔ HEIC ↔ PNG/JPG conversion
- Quality comparison preview (side-by-side before/after with file size diff)
- Batch up to 3 files free, no sign-up required
- Free tier: 10 conversions/day, 10MB/file

Happy to go deep on any part of the stack — Hono on Workers, D1 schema, the R2 lifecycle rules, or the Sharp Cloud Run setup.

---

## 2. r/SideProject

**タイトル:**
> Launched QuickConv — a WebP/AVIF/HEIC converter I built solo over a few months (next-gen image formats are a real pain point)

**本文:**

Hey r/SideProject — I just shipped [QuickConv](https://quickconv.cc), a solo side project I've been building in the gaps between my day job.

**The itch I was scratching:**

Modern cameras and iPhones shoot HEIC. Web needs WebP or AVIF. Design tools export PNG. Everyone ends up Googling "convert heic to jpg" and landing on some sketchy ad-laden site. I wanted something clean, fast, and private.

**What I built:**

- WebP / AVIF / HEIC / PNG / JPG converter — focused on next-gen formats that actually matter now
- Quality comparison preview: you can see the before/after image side-by-side with the exact file size difference before you download
- No sign-up needed to use the free tier (10 conversions/day, 10MB/file)

**Build story:**

- Frontend: Next.js static export → Cloudflare Pages (zero hosting cost)
- API: Hono on Cloudflare Workers
- Conversion: Sharp on GCP Cloud Run — the only part that costs real money, but with `max-instances=1` it's basically free until real traffic hits
- Storage: R2 with 24h auto-delete (privacy first, no files sitting around)

**Monetization:**

Went with a Good-Better-Best pricing model:
- 7-day pass: ¥450 (~$3)
- Monthly: ¥380/month (~$2.50)
- Pro: ¥1,280/month (~$8.50)

Priced for Japan initially since that's my market, but the service is fully in English too.

**Honest state:**

Just launched publicly. The conversion quality is solid and the UI is clean, but I genuinely don't know if anyone outside my circle will care. Would love brutal feedback.

→ [https://quickconv.cc](https://quickconv.cc)

---

## 3. r/iphone

**タイトル:**
> AirDrop a photo to your Mac and suddenly it's .heic and nothing opens it — I built a free converter for this exact problem

**本文:**

You know the drill:

1. Take a photo on iPhone
2. AirDrop it to your Mac or send it to someone on Windows
3. They send it back: "what's a .heic file?"
4. You go search for a converter, find a site plastered with ads, it asks you to sign up, maybe upload size is capped at 2MB

I got tired of this enough to just build one: [QuickConv](https://quickconv.cc)

**What it does:**

- Converts HEIC → JPG, PNG, WebP, AVIF in seconds
- Also works the other way (WebP/AVIF → JPG/PNG if you need compatibility)
- Free: no sign-up, 10 conversions per day, up to 10MB per file
- Files are auto-deleted after 24 hours (stored on Cloudflare R2, not some random server)

**The quality comparison feature** is the part I'm most proud of — before you download, you can see a side-by-side preview with the original vs converted image and the exact file size difference. Useful when you're deciding between JPG 85% and WebP 80% quality.

No app to install, works on any browser including Safari on iPhone.

→ [https://quickconv.cc](https://quickconv.cc)

---

## 4. r/photography

**タイトル:**
> WebP vs AVIF vs HEIC vs JPG — practical format guide for photographers (+ free converter I built)

**本文:**

Format choice comes up constantly in photography communities and the advice is all over the place. Here's a practical breakdown, and then a tool I built to make the conversion painless.

---

**Format cheat sheet for photographers:**

| Format | Best for | Watch out for |
|---|---|---|
| **HEIC** | iPhone shooting, Apple ecosystem | Poor compatibility outside Apple/modern browsers |
| **WebP** | Web delivery, blog/social | Older software may not support |
| **AVIF** | Best compression at quality, web | Slowest to encode, browser support still catching up |
| **JPG** | Universal compatibility, client delivery | Lossy, no transparency |
| **PNG** | Transparency, screenshots, lossless archiving | Large file sizes |

**When does format actually matter for photographers?**

- **Delivering to clients:** JPG is still the safest bet for compatibility. If they're tech-savvy, WebP saves ~25-35% file size.
- **Web portfolio / blog:** WebP is the right call. AVIF if you care about cutting-edge compression (15-50% smaller than WebP at equivalent quality).
- **Archive:** Keep your RAWs. If you need compressed archival, HEIC at high quality is surprisingly good.
- **Social media:** Most platforms re-encode anyway. JPG or WebP, it barely matters.

---

**On the tool:**

I built [QuickConv](https://quickconv.cc) specifically to make these conversions easy without ads or sign-up friction. The feature I use most: the **quality comparison preview** — it shows you the original vs converted file side-by-side with exact file size numbers, so you can find the right quality/size tradeoff before committing.

Free tier: 10 conversions/day, up to 10MB. No account needed.

Happy to discuss the format tradeoffs more — always curious what workflow other photographers are using.

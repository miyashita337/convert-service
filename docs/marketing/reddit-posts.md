# Reddit Post Drafts

## r/webdev — "I built a free image converter for next-gen formats"

**Title:** I built a free tool for converting HEIC/WebP/AVIF images — no signup, auto-deletes files

**Body:**
Hey r/webdev!

I built [QuickConv](https://quickconv.cc/?utm_source=reddit&utm_medium=social&utm_campaign=launch&utm_content=r_webdev) — a free online image converter focused on next-gen formats.

**Why I built it:**
- iPhone photos are HEIC, but most tools/sites don't accept them
- WebP and AVIF offer 30-50% smaller files than JPEG, but converting between them is painful
- Existing tools require signups, add watermarks, or are just slow

**Tech stack** (if anyone's curious):
- Frontend: Next.js (static export) on Cloudflare Pages
- API: Hono on Cloudflare Workers
- Converter: Sharp on GCP Cloud Run
- Storage: Cloudflare R2 (egress-free!)

**Privacy-first:** Files auto-delete after 24 hours. No accounts needed for free tier.

Would love feedback from the community. What image format issues do you run into?

---

## r/SideProject — "QuickConv — free image converter I built as a side project"

**Title:** QuickConv — My side project for converting HEIC/WebP/AVIF images (free, no signup)

**Body:**
After months of side-project work, I launched [QuickConv](https://quickconv.cc/?utm_source=reddit&utm_medium=social&utm_campaign=launch&utm_content=r_sideproject).

It's an online image converter focused on formats that are actually useful in 2026: WebP, AVIF, HEIC.

Revenue model: Free tier (10/day) + paid passes and subscriptions.

Happy to share more about the tech/business decisions if anyone's interested!

---

## r/productivity — Focus on use case

**Title:** Free tool to batch-convert iPhone HEIC photos to JPG/PNG for sharing

**Body:**
If you've ever tried to send iPhone photos to a Windows user or upload them to a website that doesn't accept HEIC — [QuickConv](https://quickconv.cc/?utm_source=reddit&utm_medium=social&utm_campaign=launch&utm_content=r_productivity) solves that.

Drop your HEIC files, pick JPG/PNG/WebP, download. No signup, free, files are deleted after 24 hours.

---

## Posting Rules
- Max 1 self-promotion post per subreddit per week
- Engage in comments genuinely
- r/webdev allows Show Projects on weekends
- r/SideProject is always open to launches

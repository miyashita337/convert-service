# Hacker News — Show HN Post

> **正準ドラフトは [`docs/launch/hn-drafts.md`](../launch/hn-drafts.md)（Issue #236）**。投稿時はそちらを使うこと。本ファイルは旧メモ（重複整理は別途）。

## Title
Show HN: QuickConv – Free image converter for WebP/AVIF/HEIC built on Cloudflare Workers

## Body
QuickConv (https://quickconv.cc) converts images between next-gen formats (WebP, AVIF, HEIC) and traditional ones (JPG, PNG).

Architecture:
- Static frontend (Next.js) on Cloudflare Pages
- API (Hono) on Cloudflare Workers
- Converter (Sharp/libvips) on GCP Cloud Run
- Storage: R2 with 24h auto-deletion lifecycle rules

No raw IPs are stored — we hash IP+cookie+UA with SHA-256 for rate limiting. Files are automatically purged after 24 hours via R2 lifecycle rules.

Free tier: 10 conversions/day, 10MB max. Paid plans remove limits.

Interested in feedback on the architecture choices and UX.

## Posting Guidelines
- Monday-Tuesday, 09:00-12:00 UTC
- Technical depth matters — focus on architecture
- Reply to every comment within 2 hours
- Don't ask for upvotes

## UTM Link
https://quickconv.cc/?utm_source=hackernews&utm_medium=social&utm_campaign=launch

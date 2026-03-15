# Product Hunt Launch Kit

## Tagline
Free online image converter for next-gen formats (WebP, AVIF, HEIC)

## Description
QuickConv is a free online image converter that makes it easy to convert between modern image formats like WebP, AVIF, and HEIC. No registration, no watermarks, and files are automatically deleted after 24 hours for privacy.

### Key Features
- Convert between HEIC, WebP, AVIF, PNG, JPG, GIF, SVG
- No signup required — just drag, drop, and convert
- Privacy-first: all files auto-deleted in 24 hours
- Built on Cloudflare Workers + GCP Cloud Run for speed
- Side-by-side quality comparison (Pro feature)

## Maker Comment
Hi Product Hunt! 👋

I built QuickConv because I kept running into compatibility issues with iPhone photos (HEIC) and modern web formats (WebP, AVIF). Existing tools were either slow, required registration, or added watermarks.

QuickConv is:
- **Fast**: Powered by Sharp on Cloud Run, conversions take seconds
- **Private**: Files are deleted after 24 hours, no accounts needed
- **Free**: 10 conversions/day, no registration

Tech stack: Next.js (static export) on Cloudflare Pages, Hono on Workers, Sharp on GCP Cloud Run, R2 for storage.

I'd love to hear your feedback! What formats do you convert most often?

## Launch Checklist
- [ ] Logo: 240×240px PNG (transparent background)
- [ ] Thumbnail: 1270×760px
- [ ] Screenshots: 5 screens (homepage, conversion flow, result, quality comparison, pricing)
- [ ] Schedule: Tuesday-Thursday, PST 00:01
- [ ] Tags: Developer Tools, Image Processing, Productivity

## UTM Link
https://quickconv.cc/?utm_source=producthunt&utm_medium=referral&utm_campaign=launch

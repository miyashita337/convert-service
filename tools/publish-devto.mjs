#!/usr/bin/env node
// Dev.to API で記事をクロスポストするスクリプト
// 使い方: DEVTO_API_KEY=xxx node tools/publish-devto.mjs

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.DEVTO_API_KEY;
if (!API_KEY) {
  console.error("ERROR: DEVTO_API_KEY が未設定です");
  process.exit(1);
}

const articlePath = resolve(__dirname, "../docs/articles/001-tech-stack.md");
const raw = readFileSync(articlePath, "utf-8");

// フロントマターを除去して本文だけ取得
const body = raw.replace(/^---[\s\S]*?---\n/, "").trim();

const CANONICAL_URL =
  "https://quickconv-dev.hashnode.dev/i-built-an-image-conversion-saas-on-almost-0month-heres-the-full-stack";

const payload = {
  article: {
    title:
      "I Built an Image Conversion SaaS on (Almost) $0/Month — Here's the Full Stack",
    body_markdown: body,
    published: true,
    canonical_url: CANONICAL_URL,
    tags: ["cloudflare", "nextjs", "typescript", "saas"],
    description:
      "A full technical breakdown of QuickConv: Next.js static export on Cloudflare Pages, Hono on Workers, Sharp on GCP Cloud Run, R2, D1, and Stripe. No marketing fluff.",
  },
};

console.log("Dev.toに投稿中...");

const res = await fetch("https://dev.to/api/articles", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "api-key": API_KEY,
  },
  body: JSON.stringify(payload),
});

const json = await res.json();

if (!res.ok) {
  console.error("エラー:", JSON.stringify(json, null, 2));
  process.exit(1);
}

console.log("✅ 投稿成功!");
console.log("  タイトル:", json.title);
console.log("  URL:", json.url);
console.log("  canonical:", json.canonical_url);

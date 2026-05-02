#!/usr/bin/env node
// Dev.to API で 002-format-comparison.md を投稿するスクリプト
// 使い方: DEVTO_API_KEY=xxx DEVTO_CANONICAL_URL=https://... node tools/publish-devto-002.mjs
//
// canonical_url は Hashnode 投稿後の URL を渡す。先に publish-hashnode-002.mjs を実行し、
// 出力 URL を DEVTO_CANONICAL_URL 環境変数にセットしてから本スクリプトを実行する。

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.DEVTO_API_KEY;
if (!API_KEY) {
  console.error("ERROR: DEVTO_API_KEY が未設定です");
  process.exit(1);
}

const CANONICAL_URL = process.env.DEVTO_CANONICAL_URL;
if (!CANONICAL_URL) {
  console.error(
    "ERROR: DEVTO_CANONICAL_URL が未設定です (Hashnode 投稿 URL を指定してください)",
  );
  process.exit(1);
}

const articlePath = resolve(
  __dirname,
  "../docs/articles/002-format-comparison.md",
);
const raw = readFileSync(articlePath, "utf-8");
const body = raw.replace(/^---[\s\S]*?---\n/, "").trim();

const payload = {
  article: {
    title:
      "WebP vs AVIF vs HEIC: The Real-World Image Format Comparison (2026)",
    body_markdown: body,
    published: true,
    canonical_url: CANONICAL_URL,
    tags: ["webdev", "images", "performance", "javascript"],
    description:
      "File size, quality, browser support, and conversion speed — a practical comparison of next-gen image formats with real benchmark data.",
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

const responseText = await res.text();
if (!res.ok) {
  console.error("HTTP エラー:", res.status, responseText);
  process.exit(1);
}

let json;
try {
  json = JSON.parse(responseText);
} catch (e) {
  console.error("JSON パース失敗:", responseText);
  process.exit(1);
}

console.log("✅ 投稿成功!");
console.log("  タイトル:", json.title);
console.log("  URL:", json.url);
console.log("  canonical:", json.canonical_url);

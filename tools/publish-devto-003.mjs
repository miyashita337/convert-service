#!/usr/bin/env node
// Dev.to API で 003-claude-code-web-setup-hook.md を投稿するスクリプト
// 使い方: DEVTO_API_KEY=xxx node tools/publish-devto-003.mjs

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.DEVTO_API_KEY;
if (!API_KEY) {
  console.error("ERROR: DEVTO_API_KEY が未設定です");
  process.exit(1);
}

const articlePath = resolve(
  __dirname,
  "../docs/articles/003-claude-code-web-setup-hook.md",
);
const raw = readFileSync(articlePath, "utf-8");
const body = raw.replace(/^---[\s\S]*?---\n/, "").trim();

const payload = {
  article: {
    title:
      "Claude Code on the Web: Why Your .env Vars Don't Reach the Setup Script (and How SessionStart Hook Fixes It)",
    body_markdown: body,
    published: true,
    canonical_url: "https://zenn.dev/harieshokunin/articles/b1064354319ce2",
    tags: ["anthropic", "claude", "devops", "bash"],
    description:
      "A debugging story about Claude Code Cloud Sandbox: the .env panel vars never make it into the setup script, only into the session shell. Moving clone logic to a SessionStart hook makes everything work.",
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

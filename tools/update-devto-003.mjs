#!/usr/bin/env node
// Dev.to API で公開済みの 003 記事を更新するスクリプト
// 使い方: DEVTO_API_KEY=xxx node tools/update-devto-003.mjs

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.DEVTO_API_KEY;
if (!API_KEY) {
  console.error("ERROR: DEVTO_API_KEY が未設定です");
  process.exit(1);
}

const TITLE =
  "Claude Code on the Web: Why Your .env Vars Don't Reach the Setup Script (and How SessionStart Hook Fixes It)";

console.log("自分の記事一覧を取得中...");
const listRes = await fetch("https://dev.to/api/articles/me", {
  headers: { "api-key": API_KEY },
});
const list = await listRes.json();
if (!listRes.ok) {
  console.error("一覧取得エラー:", JSON.stringify(list, null, 2));
  process.exit(1);
}
const target = list.find((a) => a.title === TITLE);
if (!target) {
  console.error(`記事が見つかりません: ${TITLE}`);
  console.error("candidates:", list.map((a) => a.title));
  process.exit(1);
}
console.log(`  ID: ${target.id} (${target.url})`);

const articlePath = resolve(
  __dirname,
  "../docs/articles/003-claude-code-web-setup-hook.md",
);
const raw = readFileSync(articlePath, "utf-8");
const body = raw.replace(/^---[\s\S]*?---\n/, "").trim();

const payload = {
  article: {
    title: TITLE,
    body_markdown: body,
    published: true,
    canonical_url: "https://zenn.dev/harieshokunin/articles/b1064354319ce2",
    tags: ["anthropic", "claude", "devops", "bash"],
    description:
      "A debugging story about Claude Code Cloud Sandbox: the .env panel vars never make it into the setup script, only into the session shell. Moving clone logic to a SessionStart hook makes everything work.",
  },
};

console.log("Dev.to 記事を更新中...");
const res = await fetch(`https://dev.to/api/articles/${target.id}`, {
  method: "PUT",
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

console.log("✅ 更新成功!");
console.log("  URL:", json.url);

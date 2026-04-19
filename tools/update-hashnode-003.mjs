#!/usr/bin/env node
// Hashnode GraphQL API で公開済みの 003 記事を更新するスクリプト
// 使い方: HASHNODE_TOKEN=xxx HASHNODE_PUBLICATION_ID=xxx node tools/update-hashnode-003.mjs

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.HASHNODE_TOKEN;
const PUBLICATION_SLUG = process.env.HASHNODE_PUBLICATION_ID;

if (!TOKEN || !PUBLICATION_SLUG) {
  console.error("ERROR: HASHNODE_TOKEN / HASHNODE_PUBLICATION_ID が未設定");
  process.exit(1);
}

const POST_SLUG =
  "claude-code-on-the-web-why-your-env-vars-dont-reach-the-setup-script-and-how-sessionstart-hook-fixes-it";

async function gql(query, variables) {
  const res = await fetch("https://gql.hashnode.com", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error("GraphQL エラー:", JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }
  return json.data;
}

const host = PUBLICATION_SLUG.includes(".")
  ? PUBLICATION_SLUG
  : `${PUBLICATION_SLUG}.hashnode.dev`;

console.log(`Post ID を取得中 (host: ${host}, slug: ${POST_SLUG})...`);
const lookup = await gql(
  `query($host: String!, $slug: String!) {
     publication(host: $host) {
       post(slug: $slug) { id title }
     }
   }`,
  { host, slug: POST_SLUG },
);
const post = lookup.publication?.post;
if (!post) {
  console.error("記事が見つかりません");
  process.exit(1);
}
console.log(`  ID: ${post.id} (${post.title})`);

const articlePath = resolve(
  __dirname,
  "../docs/articles/003-claude-code-web-setup-hook.md",
);
const raw = readFileSync(articlePath, "utf-8");
const body = raw.replace(/^---[\s\S]*?---\n/, "").trim();

const title =
  "Claude Code on the Web: Why Your .env Vars Don't Reach the Setup Script (and How SessionStart Hook Fixes It)";
const tags = [
  { slug: "anthropic", name: "Anthropic" },
  { slug: "claude", name: "Claude" },
  { slug: "devops", name: "DevOps" },
  { slug: "bash", name: "Bash" },
];

console.log("Hashnode 記事を更新中...");
const updated = await gql(
  `mutation($input: UpdatePostInput!) {
     updatePost(input: $input) {
       post { id title url slug }
     }
   }`,
  {
    input: {
      id: post.id,
      title,
      contentMarkdown: body,
      tags,
      originalArticleURL: "https://zenn.dev/harieshokunin/articles/b1064354319ce2",
      metaTags: {
        title,
        description:
          "A debugging story about Claude Code Cloud Sandbox: the .env panel vars never make it into the setup script, only into the session shell. Moving clone logic to a SessionStart hook makes everything work.",
      },
    },
  },
);
const result = updated.updatePost.post;
console.log("✅ 更新成功!");
console.log("  URL:", result.url);

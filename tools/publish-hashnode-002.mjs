#!/usr/bin/env node
// Hashnode GraphQL API で 002-format-comparison.md を投稿するスクリプト
// 使い方: HASHNODE_TOKEN=xxx HASHNODE_PUBLICATION_ID=xxx node tools/publish-hashnode-002.mjs

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.HASHNODE_TOKEN;
const PUBLICATION_SLUG = process.env.HASHNODE_PUBLICATION_ID;

if (!TOKEN) {
  console.error("ERROR: HASHNODE_TOKEN が未設定です");
  process.exit(1);
}
if (!PUBLICATION_SLUG) {
  console.error("ERROR: HASHNODE_PUBLICATION_ID が未設定です");
  process.exit(1);
}

const isObjectId = /^[a-f0-9]{24}$/i.test(PUBLICATION_SLUG);

let PUBLICATION_ID = PUBLICATION_SLUG;
if (!isObjectId) {
  const host = PUBLICATION_SLUG.includes(".")
    ? PUBLICATION_SLUG
    : `${PUBLICATION_SLUG}.hashnode.dev`;
  console.log(`Publication ID を取得中 (host: ${host})...`);
  const res = await fetch("https://gql.hashnode.com", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: TOKEN },
    body: JSON.stringify({
      query: `{ publication(host: "${host}") { id title } }`,
    }),
  });
  const json = await res.json();
  if (json.errors || !json.data?.publication?.id) {
    console.error("Publication取得エラー:", JSON.stringify(json, null, 2));
    process.exit(1);
  }
  PUBLICATION_ID = json.data.publication.id;
  console.log(`  ID: ${PUBLICATION_ID} (${json.data.publication.title})`);
}

const articlePath = resolve(
  __dirname,
  "../docs/articles/002-format-comparison.md",
);
const raw = readFileSync(articlePath, "utf-8");
const body = raw.replace(/^---[\s\S]*?---\n/, "").trim();

const title =
  "WebP vs AVIF vs HEIC: The Real-World Image Format Comparison (2026)";
const tags = [
  { slug: "webdev", name: "WebDev" },
  { slug: "images", name: "Images" },
  { slug: "performance", name: "Performance" },
  { slug: "cloudflare", name: "Cloudflare" },
  { slug: "javascript", name: "JavaScript" },
];

const mutation = `
  mutation PublishPost($input: PublishPostInput!) {
    publishPost(input: $input) {
      post {
        id
        title
        url
        slug
      }
    }
  }
`;

const variables = {
  input: {
    title,
    contentMarkdown: body,
    tags,
    publicationId: PUBLICATION_ID,
    metaTags: {
      title,
      description:
        "File size, quality, browser support, and conversion speed — a practical comparison of next-gen image formats with real benchmark data.",
    },
  },
};

console.log("Hashnodeに投稿中...");

const res = await fetch("https://gql.hashnode.com", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: TOKEN,
  },
  body: JSON.stringify({ query: mutation, variables }),
});

const json = await res.json();

if (json.errors) {
  console.error("エラー:", JSON.stringify(json.errors, null, 2));
  process.exit(1);
}

const post = json.data.publishPost.post;
console.log("✅ 投稿成功!");
console.log("  タイトル:", post.title);
console.log("  URL:", post.url);

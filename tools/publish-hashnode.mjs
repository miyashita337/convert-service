#!/usr/bin/env node
// Hashnode GraphQL API で記事を投稿するスクリプト
// 使い方: HASHNODE_TOKEN=xxx HASHNODE_PUBLICATION_ID=xxx node tools/publish-hashnode.mjs

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.HASHNODE_TOKEN;
const PUBLICATION_SLUG = process.env.HASHNODE_PUBLICATION_ID; // slug or ObjectId

if (!TOKEN) {
  console.error("ERROR: HASHNODE_TOKEN が未設定です");
  process.exit(1);
}
if (!PUBLICATION_SLUG) {
  console.error("ERROR: HASHNODE_PUBLICATION_ID が未設定です");
  process.exit(1);
}

// MongoDB ObjectId かどうか判定（24文字の hex）
const isObjectId = /^[a-f0-9]{24}$/i.test(PUBLICATION_SLUG);

let PUBLICATION_ID = PUBLICATION_SLUG;
if (!isObjectId) {
  // スラッグから実際のIDを取得
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

// 記事ファイルを読み込む
const articlePath = resolve(__dirname, "../docs/articles/001-tech-stack.md");
const raw = readFileSync(articlePath, "utf-8");

// フロントマターを除去して本文だけ取得
const body = raw.replace(/^---[\s\S]*?---\n/, "").trim();

const title =
  "I Built an Image Conversion SaaS on (Almost) $0/Month — Here's the Full Stack";
const tags = [
  { slug: "cloudflare", name: "Cloudflare" },
  { slug: "nextjs", name: "Next.js" },
  { slug: "typescript", name: "TypeScript" },
  { slug: "saas", name: "SaaS" },
  { slug: "webdev", name: "Web Development" },
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
        "A full technical breakdown of QuickConv: Next.js static export on Cloudflare Pages, Hono on Workers, Sharp on GCP Cloud Run, R2, D1, and Stripe. No marketing fluff.",
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

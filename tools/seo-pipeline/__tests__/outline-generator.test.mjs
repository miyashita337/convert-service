// node --test tools/seo-pipeline/__tests__/outline-generator.test.mjs
//
// Issue #325 のユニットテスト:
// - parseArgs: --keyword / --keywords-file / --competitor-file 必須
// - composeOutline: H1/H2 構造、>=5 H2、TODO マーカー、fallback メタ
// - estimateTokens: 日英分岐
// - loadJsonFile: 存在しない/不正 JSON でエラー

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseArgs,
  composeOutline,
  estimateTokens,
  loadJsonFile,
} from "../outline-generator.mjs";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

/* parseArgs */

test("parseArgs: 必須引数欠落でエラー", () => {
  assert.throws(() => parseArgs([]), /--keyword is required/);
  assert.throws(
    () => parseArgs(["--keyword", "k"]),
    /--keywords-file is required/,
  );
  assert.throws(
    () => parseArgs(["--keyword", "k", "--keywords-file", "x"]),
    /--competitor-file is required/,
  );
});

test("parseArgs: 全引数指定", () => {
  const r = parseArgs([
    "--keyword",
    "x",
    "--keywords-file",
    "kw.json",
    "--competitor-file",
    "comp.json",
    "--out",
    "out",
    "--dry-run",
  ]);
  assert.equal(r.keyword, "x");
  assert.equal(r.keywordsFile, "kw.json");
  assert.equal(r.competitorFile, "comp.json");
  assert.equal(r.outDir, "out");
  assert.equal(r.dryRun, true);
});

/* loadJsonFile */

test("loadJsonFile: 存在しないファイルでエラー", () => {
  assert.throws(() => loadJsonFile("/nonexistent/file.json"), /file not found/);
});

test("loadJsonFile: 不正 JSON でエラー", () => {
  const p = resolve(tmpdir(), `bad-${Date.now()}.json`);
  writeFileSync(p, "{ not valid }");
  try {
    assert.throws(() => loadJsonFile(p), /invalid JSON/);
  } finally {
    rmSync(p, { force: true });
  }
});

test("loadJsonFile: 正常 JSON を parse", () => {
  const p = resolve(tmpdir(), `good-${Date.now()}.json`);
  writeFileSync(p, '{"a":1}');
  try {
    assert.deepEqual(loadJsonFile(p), { a: 1 });
  } finally {
    rmSync(p, { force: true });
  }
});

/* composeOutline */

const SAMPLE_KEYWORDS = {
  version: "1",
  generated_at: "2026-05-13T00:00:00Z",
  meta: { fallback: true, seeds: ["WebP 変換"], source: "manual-seed" },
  keywords: [
    { keyword: "WebP 変換", score: 0, source: "seed" },
    { keyword: "WebP 変換 無料", score: 0, source: "expansion" },
    { keyword: "WebP 変換 方法", score: 0, source: "expansion" },
  ],
};

const SAMPLE_COMPETITOR = {
  version: "1",
  generated_at: "2026-05-13T00:00:00Z",
  meta: { keyword: "WebP 変換", url_count: 3, sandbox_applied: true, source: "manual-urls" },
  competitive_analysis: [
    {
      url: "https://a.com/1",
      title: "T1",
      headings: [
        { level: 2, text: "WebPとは" },
        { level: 2, text: "WebPの利点" },
        { level: 3, text: "圧縮率" },
        { level: 3, text: "互換性" },
      ],
      fetched_at: "x",
      status: "ok",
    },
    {
      url: "https://b.com/1",
      title: "T2",
      headings: [
        { level: 2, text: "WebPとは" },
        { level: 2, text: "PNG との違い" },
        { level: 2, text: "変換手順" },
        { level: 3, text: "デスクトップアプリ" },
      ],
      fetched_at: "x",
      status: "ok",
    },
    {
      url: "https://c.com/1",
      title: "T3",
      headings: [
        { level: 2, text: "WebPの利点" },
        { level: 2, text: "変換手順" },
        { level: 2, text: "おすすめツール" },
      ],
      fetched_at: "x",
      status: "ok",
    },
  ],
};

test("composeOutline: empty keyword でエラー", () => {
  assert.throws(() =>
    composeOutline({
      keyword: "",
      keywordsData: SAMPLE_KEYWORDS,
      competitorData: SAMPLE_COMPETITOR,
    }),
  );
});

test("composeOutline: H1 を含む", () => {
  const md = composeOutline({
    keyword: "WebP 変換",
    keywordsData: SAMPLE_KEYWORDS,
    competitorData: SAMPLE_COMPETITOR,
  });
  assert.ok(/^# WebP 変換/.test(md.split("\n")[0]));
});

test("composeOutline: 競合 H2 を頻度順で取り込み (>= 5 H2)", () => {
  const md = composeOutline({
    keyword: "WebP 変換",
    keywordsData: SAMPLE_KEYWORDS,
    competitorData: SAMPLE_COMPETITOR,
  });
  const h2count = (md.match(/^## /gm) || []).length;
  assert.ok(h2count >= 5, `expected >= 5 H2, got ${h2count}`);
});

test("composeOutline: 競合データなしでも構成案を生成", () => {
  const empty = {
    version: "1",
    generated_at: "x",
    meta: { keyword: "x", url_count: 0, sandbox_applied: true, source: "manual-urls" },
    competitive_analysis: [],
  };
  const md = composeOutline({
    keyword: "WebP 変換",
    keywordsData: SAMPLE_KEYWORDS,
    competitorData: empty,
  });
  assert.ok(md.length > 100);
  // fallback メッセージが入る
  assert.ok(md.includes("競合データなし"));
});

test("composeOutline: 行数 >= 30", () => {
  const md = composeOutline({
    keyword: "WebP 変換",
    keywordsData: SAMPLE_KEYWORDS,
    competitorData: SAMPLE_COMPETITOR,
  });
  const lines = md.split("\n").length;
  assert.ok(lines >= 30, `expected >= 30 lines, got ${lines}`);
});

test("composeOutline: keywords.fallback メタが反映される", () => {
  const md = composeOutline({
    keyword: "WebP 変換",
    keywordsData: SAMPLE_KEYWORDS,
    competitorData: SAMPLE_COMPETITOR,
  });
  assert.ok(md.includes("fallback=true"));
});

test("composeOutline: QuickConv セクションを必ず含む", () => {
  const md = composeOutline({
    keyword: "WebP 変換",
    keywordsData: SAMPLE_KEYWORDS,
    competitorData: SAMPLE_COMPETITOR,
  });
  assert.ok(md.includes("QuickConv での実例"));
});

/* estimateTokens */

test("estimateTokens: 日本語は chars/2", () => {
  // 日本語含む 10 文字 → ceil(10/2) = 5
  assert.equal(estimateTokens("WebP 変換テスト"), Math.ceil("WebP 変換テスト".length / 2));
});

test("estimateTokens: 英語のみは chars/4", () => {
  assert.equal(estimateTokens("hello world"), Math.ceil("hello world".length / 4));
});

test("estimateTokens: 非文字列で 0", () => {
  assert.equal(estimateTokens(null), 0);
  assert.equal(estimateTokens(42), 0);
});

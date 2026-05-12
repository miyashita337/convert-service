// node --test tools/seo-pipeline/__tests__/keyword-research.test.mjs
//
// Issue #323 AC のユニットテスト:
// - parseArgs: 空 seed エラー、複数 seed、不正引数
// - expandSeed: 日英判定、最大バリアント数
// - computeScore: 境界値 (impressions=0, position<=0, ctr 無し)
// - validateKeywordsOutput: 必須フィールド
// - generateKeywords: フォールバック動作、GSC データ統合、空 seed エラー

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseArgs,
  expandSeed,
  computeScore,
  validateKeywordsOutput,
  generateKeywords,
  loadEnvSeo,
} from "../keyword-research.mjs";

/* -------------------------------------------------------------------------- */
/* parseArgs                                                                  */
/* -------------------------------------------------------------------------- */

test("parseArgs: 空 seed なしの場合はエラー", () => {
  assert.throws(() => parseArgs([]), /at least one --seed is required/);
});

test("parseArgs: 単一 seed", () => {
  const r = parseArgs(["--seed", "WebP 変換"]);
  assert.deepEqual(r.seeds, ["WebP 変換"]);
  assert.equal(r.outDir, "docs/articles/seo-drafts");
  assert.equal(r.dryRun, false);
});

test("parseArgs: 複数 seed + out + dry-run", () => {
  const r = parseArgs(["--seed", "A", "--seed", "B", "--out", "custom", "--dry-run"]);
  assert.deepEqual(r.seeds, ["A", "B"]);
  assert.equal(r.outDir, "custom");
  assert.equal(r.dryRun, true);
});

test("parseArgs: --seed の値欠落でエラー", () => {
  assert.throws(() => parseArgs(["--seed"]), /--seed requires a value/);
});

test("parseArgs: 不明引数でエラー", () => {
  assert.throws(() => parseArgs(["--unknown"]), /Unknown argument/);
});

test("parseArgs: --help でショートサーキット", () => {
  const r = parseArgs(["--help"]);
  assert.equal(r.help, true);
});

/* -------------------------------------------------------------------------- */
/* expandSeed                                                                 */
/* -------------------------------------------------------------------------- */

test("expandSeed: 空文字は空配列", () => {
  assert.deepEqual(expandSeed(""), []);
  assert.deepEqual(expandSeed("   "), []);
});

test("expandSeed: 日本語 seed で seed + 修飾語のバリアント", () => {
  const r = expandSeed("WebP 変換");
  assert.ok(r.length >= 3, `expected >=3 variants, got ${r.length}`);
  assert.equal(r[0], "WebP 変換");
  assert.ok(r.some((v) => v.includes("方法") || v.includes("やり方") || v.includes("無料")));
});

test("expandSeed: 英語 seed で英語修飾語", () => {
  const r = expandSeed("webp converter");
  assert.ok(r.length >= 3);
  assert.equal(r[0], "webp converter");
  assert.ok(r.some((v) => v.includes("free") || v.includes("online") || v.includes("tool")));
});

test("expandSeed: maxVariants 上限を尊重", () => {
  const r = expandSeed("WebP 変換", { maxVariants: 3 });
  // seed 自身 + 最大 maxVariants 個 = 最大 maxVariants+1
  assert.ok(r.length <= 4, `expected <=4, got ${r.length}`);
});

/* -------------------------------------------------------------------------- */
/* computeScore — 境界値                                                       */
/* -------------------------------------------------------------------------- */

test("computeScore: impressions=0 → 0", () => {
  assert.equal(computeScore({ impressions: 0, ctr: 0.1, position: 5 }), 0);
});

test("computeScore: position=0 → 0", () => {
  assert.equal(computeScore({ impressions: 100, ctr: 0.1, position: 0 }), 0);
});

test("computeScore: position<0 → 0", () => {
  assert.equal(computeScore({ impressions: 100, ctr: 0.1, position: -1 }), 0);
});

test("computeScore: impressions=NaN → 0", () => {
  assert.equal(computeScore({ impressions: NaN, ctr: 0.1, position: 5 }), 0);
});

test("computeScore: ctr 無しでも score 計算可能", () => {
  // 100 * (1/5) * (1 + 0*10) = 20
  assert.equal(computeScore({ impressions: 100, position: 5 }), 20);
});

test("computeScore: ctr 込みでスコア増", () => {
  // 100 * (1/5) * (1 + 0.1*10) = 20 * 2 = 40
  assert.equal(computeScore({ impressions: 100, ctr: 0.1, position: 5 }), 40);
});

test("computeScore: position が高い (低い順位) ほど低スコア", () => {
  const high = computeScore({ impressions: 100, position: 1 });
  const low = computeScore({ impressions: 100, position: 50 });
  assert.ok(high > low, `expected position=1 > position=50, got ${high} vs ${low}`);
});

/* -------------------------------------------------------------------------- */
/* validateKeywordsOutput                                                     */
/* -------------------------------------------------------------------------- */

test("validateKeywordsOutput: 正常な payload はエラー 0", () => {
  const ok = {
    version: "1",
    generated_at: "2026-05-13T00:00:00Z",
    meta: { fallback: false, seeds: ["x"], source: "manual-seed" },
    keywords: [{ keyword: "x", score: 1.5, source: "seed" }],
  };
  assert.deepEqual(validateKeywordsOutput(ok), []);
});

test("validateKeywordsOutput: 必須フィールド欠落を検出", () => {
  const errs = validateKeywordsOutput({});
  assert.ok(errs.length > 0);
  assert.ok(errs.some((e) => e.includes("version")));
  assert.ok(errs.some((e) => e.includes("keywords")));
});

test("validateKeywordsOutput: keywords 内の型ミスを検出", () => {
  const errs = validateKeywordsOutput({
    version: "1",
    generated_at: "x",
    meta: { fallback: false, seeds: [], source: "x" },
    keywords: [{ keyword: "", score: "not-number", source: 123 }],
  });
  assert.ok(errs.some((e) => e.includes("keyword")));
  assert.ok(errs.some((e) => e.includes("score")));
  assert.ok(errs.some((e) => e.includes("source")));
});

test("validateKeywordsOutput: root が非オブジェクトはエラー", () => {
  assert.ok(validateKeywordsOutput(null).length > 0);
  assert.ok(validateKeywordsOutput("string").length > 0);
});

/* -------------------------------------------------------------------------- */
/* generateKeywords                                                           */
/* -------------------------------------------------------------------------- */

test("generateKeywords: 空 seeds でエラー", async () => {
  await assert.rejects(generateKeywords({ seeds: [] }), /non-empty array/);
});

test("generateKeywords: 空文字のみの seeds でエラー", async () => {
  await assert.rejects(generateKeywords({ seeds: ["   ", ""] }), /empty strings/);
});

test("generateKeywords: 認証情報なし → フォールバック動作", async () => {
  const result = await generateKeywords({
    seeds: ["WebP 変換"],
    env: {},
    gscFetcher: async () => null,
  });
  assert.equal(result.meta.fallback, true);
  assert.equal(result.meta.source, "manual-seed");
  assert.ok(result.keywords.length >= 3, `expected >=3 keywords, got ${result.keywords.length}`);
  // seed が含まれる
  assert.ok(result.keywords.some((k) => k.keyword === "WebP 変換" && k.source === "seed"));
});

test("generateKeywords: GSC fetcher が例外を投げてもフォールバックで続行", async () => {
  const result = await generateKeywords({
    seeds: ["WebP 変換"],
    env: { GSC_OAUTH_CLIENT_ID: "x", GSC_OAUTH_CLIENT_SECRET: "y", GSC_REFRESH_TOKEN: "z", GSC_SITE_URL: "https://example.com" },
    gscFetcher: async () => {
      throw new Error("network down");
    },
  });
  assert.equal(result.meta.fallback, true);
  assert.equal(result.meta.warning, "network down");
  assert.ok(result.keywords.length >= 3);
});

test("generateKeywords: GSC データありで search-console source + score", async () => {
  const result = await generateKeywords({
    seeds: ["WebP"],
    env: {},
    gscFetcher: async () => [
      { keys: ["WebP 変換 無料"], impressions: 1000, ctr: 0.05, position: 3 },
      { keys: ["WebP"], impressions: 500, ctr: 0.1, position: 1 },
    ],
  });
  assert.equal(result.meta.fallback, false);
  assert.equal(result.meta.source, "search-console");
  // GSC からのキーワードが取り込まれている
  const gscKw = result.keywords.find((k) => k.keyword === "WebP 変換 無料");
  assert.ok(gscKw);
  assert.ok(gscKw.score > 0);
  assert.equal(gscKw.search_volume, 1000);
  assert.equal(gscKw.ctr, 0.05);
});

test("generateKeywords: seed 重複は除外される", async () => {
  const result = await generateKeywords({
    seeds: ["WebP", "WebP", "  WebP  "],
    env: {},
    gscFetcher: async () => null,
  });
  assert.deepEqual(result.meta.seeds, ["WebP"]);
});

test("generateKeywords: keywords が score 降順で sort される", async () => {
  const result = await generateKeywords({
    seeds: ["WebP"],
    env: {},
    gscFetcher: async () => [
      { keys: ["low"], impressions: 10, ctr: 0, position: 10 },
      { keys: ["high"], impressions: 1000, ctr: 0.1, position: 1 },
      { keys: ["mid"], impressions: 100, ctr: 0.05, position: 3 },
    ],
  });
  // score 降順 (seed 由来は score=0 で末尾)
  const scores = result.keywords.map((k) => k.score);
  for (let i = 1; i < scores.length; i++) {
    assert.ok(scores[i - 1] >= scores[i], `not sorted desc: ${JSON.stringify(scores)}`);
  }
});

test("generateKeywords: GSC reachable but 0 rows → fallback=false, primary source", async () => {
  const result = await generateKeywords({
    seeds: ["WebP"],
    env: {},
    gscFetcher: async () => [],
  });
  assert.equal(result.meta.fallback, false);
  assert.equal(result.meta.source, "search-console");
  // それでも seed expansion は含まれる
  assert.ok(result.keywords.length >= 3);
});

/* -------------------------------------------------------------------------- */
/* loadEnvSeo                                                                 */
/* -------------------------------------------------------------------------- */

test("loadEnvSeo: 存在しないファイルは空オブジェクト", () => {
  const r = loadEnvSeo("/nonexistent/path/.env.seo");
  assert.deepEqual(r, {});
});

test("loadEnvSeo: example ファイルをパース可能", () => {
  const r = loadEnvSeo(new URL("../.env.seo.example", import.meta.url).pathname);
  assert.equal(r.GSC_SITE_URL, "https://quickconv.cc/");
  assert.equal(r.MAX_CLAUDE_TOKENS_PER_RUN, "200000");
});

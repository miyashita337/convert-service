// node --test tools/seo-pipeline/__tests__/retrospective.test.mjs
//
// Issue #327 (Epic #320 Sub 7) retrospective.mjs ユニットテスト:
// - parseArgs: 数値フラグ, --json, 不正引数
// - resolveSince: 既定 14 日前, 明示指定
// - computeGenerationStats: 0 件 → rate null, 混在, 全成功
// - attributeBuildFailures: total vs seo-pipeline 起因の属性判定
// - evaluateMetrics: 各しきい値 (success<70% / hitl<50% / cost>15k / build>=2 / indexed=0)
//   + 未計測=null の扱い
// - decideVerdict: 1件 breach → abolish / 全 PASS → phase2 / 未計測 → inconclusive
// - formatReport: 5 指標が各 1 行で出力される (journey AC)

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  THRESHOLDS,
  parseArgs,
  resolveSince,
  computeGenerationStats,
  attributeBuildFailures,
  evaluateMetrics,
  decideVerdict,
  formatReport,
} from "../retrospective.mjs";

/* -------------------------------------------------------------------------- */
/* parseArgs                                                                  */
/* -------------------------------------------------------------------------- */

test("parseArgs: 既定値", () => {
  const r = parseArgs([]);
  assert.equal(r.since, null);
  assert.equal(r.draftsDir, "docs/articles/seo-drafts");
  assert.equal(r.claudeCostYen, null);
  assert.equal(r.json, false);
});

test("parseArgs: 数値フラグ + --since + --json", () => {
  const r = parseArgs([
    "--since",
    "2026-05-13",
    "--claude-cost-yen",
    "12000",
    "--indexed-count",
    "0",
    "--hitl-approved",
    "1",
    "--hitl-total",
    "2",
    "--json",
  ]);
  assert.equal(r.since, "2026-05-13");
  assert.equal(r.claudeCostYen, 12000);
  assert.equal(r.indexedCount, 0);
  assert.equal(r.hitlApproved, 1);
  assert.equal(r.hitlTotal, 2);
  assert.equal(r.json, true);
});

test("parseArgs: 非数値フラグでエラー", () => {
  assert.throws(
    () => parseArgs(["--claude-cost-yen", "abc"]),
    /requires a number/,
  );
});

test("parseArgs: 不明な引数でエラー", () => {
  assert.throws(() => parseArgs(["--bogus"]), /Unknown argument/);
});

test("parseArgs: --since が YYYY-MM-DD 以外でエラー", () => {
  assert.throws(() => parseArgs(["--since", "2026/05/13"]), /YYYY-MM-DD/);
  assert.throws(() => parseArgs(["--since", "next-tuesday"]), /YYYY-MM-DD/);
});

test("parseArgs: --help", () => {
  assert.deepEqual(parseArgs(["--help"]), { help: true });
});

/* -------------------------------------------------------------------------- */
/* resolveSince                                                               */
/* -------------------------------------------------------------------------- */

test("resolveSince: 明示指定はそのまま", () => {
  assert.equal(resolveSince("2026-05-13"), "2026-05-13");
});

test("resolveSince: 省略時は today から 14 日前", () => {
  const today = new Date("2026-06-13T00:00:00Z");
  assert.equal(resolveSince(null, today), "2026-05-30");
});

/* -------------------------------------------------------------------------- */
/* computeGenerationStats                                                     */
/* -------------------------------------------------------------------------- */

test("computeGenerationStats: 0 件で rate null", () => {
  const s = computeGenerationStats([]);
  assert.equal(s.total, 0);
  assert.equal(s.success, 0);
  assert.equal(s.rate, null);
});

test("computeGenerationStats: 混在 (2/3)", () => {
  const s = computeGenerationStats([
    { date: "2026-05-13", hasOutline: true },
    { date: "2026-05-14", hasOutline: false },
    { date: "2026-05-15", hasOutline: true },
  ]);
  assert.equal(s.total, 3);
  assert.equal(s.success, 2);
  assert.ok(Math.abs(s.rate - 2 / 3) < 1e-9);
});

test("computeGenerationStats: 全成功で rate 1", () => {
  const s = computeGenerationStats([{ date: "2026-05-13", hasOutline: true }]);
  assert.equal(s.rate, 1);
});

/* -------------------------------------------------------------------------- */
/* attributeBuildFailures                                                     */
/* -------------------------------------------------------------------------- */

test("attributeBuildFailures: seo-pipeline 起因のみ計上", () => {
  const failing = [{ headSha: "aaa" }, { headSha: "bbb" }, { headSha: "ccc" }];
  const touched = (sha) => sha === "bbb"; // bbb だけ seo-pipeline を触れた
  const r = attributeBuildFailures(failing, touched);
  assert.equal(r.totalCiFailures, 3);
  assert.equal(r.pipelineAttributable, 1);
});

test("attributeBuildFailures: 0 件", () => {
  const r = attributeBuildFailures([], () => true);
  assert.equal(r.totalCiFailures, 0);
  assert.equal(r.pipelineAttributable, 0);
});

/* -------------------------------------------------------------------------- */
/* evaluateMetrics                                                            */
/* -------------------------------------------------------------------------- */

function baseInput(overrides = {}) {
  return {
    genStats: { total: 5, success: 5, rate: 1 },
    hitl: { approved: null, total: null },
    claudeCostYen: null,
    build: { ok: true, totalCiFailures: 0, pipelineAttributable: 0 },
    indexedCount: null,
    ...overrides,
  };
}

test("evaluateMetrics: 生成成功率 0 件は breach (未運用)", () => {
  const m = evaluateMetrics(
    baseInput({ genStats: { total: 0, success: 0, rate: null } }),
  );
  const gen = m.find((x) => x.key === "generationSuccessRate");
  assert.equal(gen.value, null);
  assert.equal(gen.breached, true);
});

test("evaluateMetrics: 生成成功率 60% は breach (<70%)", () => {
  const m = evaluateMetrics(
    baseInput({ genStats: { total: 5, success: 3, rate: 0.6 } }),
  );
  assert.equal(m.find((x) => x.key === "generationSuccessRate").breached, true);
});

test("evaluateMetrics: 生成成功率 80% は PASS", () => {
  const m = evaluateMetrics(
    baseInput({ genStats: { total: 5, success: 4, rate: 0.8 } }),
  );
  assert.equal(
    m.find((x) => x.key === "generationSuccessRate").breached,
    false,
  );
});

test("evaluateMetrics: HITL 未入力は未計測 null", () => {
  const m = evaluateMetrics(baseInput());
  assert.equal(m.find((x) => x.key === "hitlApprovalRate").breached, null);
});

test("evaluateMetrics: HITL 40% は breach (<50%)", () => {
  const m = evaluateMetrics(baseInput({ hitl: { approved: 2, total: 5 } }));
  assert.equal(m.find((x) => x.key === "hitlApprovalRate").breached, true);
});

test("evaluateMetrics: Claude 料金 ¥16000 は breach (>15k)", () => {
  const m = evaluateMetrics(baseInput({ claudeCostYen: 16000 }));
  assert.equal(m.find((x) => x.key === "claudeCostYen").breached, true);
});

test("evaluateMetrics: Claude 料金 ¥0 は PASS", () => {
  const m = evaluateMetrics(baseInput({ claudeCostYen: 0 }));
  assert.equal(m.find((x) => x.key === "claudeCostYen").breached, false);
});

test("evaluateMetrics: ビルド破壊 2 件は breach (>=2)", () => {
  const m = evaluateMetrics(
    baseInput({
      build: { ok: true, totalCiFailures: 5, pipelineAttributable: 2 },
    }),
  );
  assert.equal(m.find((x) => x.key === "buildBreakage").breached, true);
});

test("evaluateMetrics: ビルド破壊 1 件は PASS (<2)", () => {
  const m = evaluateMetrics(
    baseInput({
      build: { ok: true, totalCiFailures: 5, pipelineAttributable: 1 },
    }),
  );
  assert.equal(m.find((x) => x.key === "buildBreakage").breached, false);
});

test("evaluateMetrics: gh 取得失敗時は build 未計測 null", () => {
  const m = evaluateMetrics(
    baseInput({
      build: {
        ok: false,
        error: "gh down",
        totalCiFailures: null,
        pipelineAttributable: null,
      },
    }),
  );
  assert.equal(m.find((x) => x.key === "buildBreakage").breached, null);
});

test("evaluateMetrics: インデックス 0 本は breach", () => {
  const m = evaluateMetrics(baseInput({ indexedCount: 0 }));
  assert.equal(m.find((x) => x.key === "indexedCount").breached, true);
});

test("evaluateMetrics: インデックス 3 本は PASS", () => {
  const m = evaluateMetrics(baseInput({ indexedCount: 3 }));
  assert.equal(m.find((x) => x.key === "indexedCount").breached, false);
});

test("THRESHOLDS が Issue #327 の表と一致", () => {
  assert.equal(THRESHOLDS.generationSuccessRate, 0.7);
  assert.equal(THRESHOLDS.hitlApprovalRate, 0.5);
  assert.equal(THRESHOLDS.claudeCostYen, 15000);
  assert.equal(THRESHOLDS.buildBreakage, 2);
  assert.equal(THRESHOLDS.minIndexedCount, 1);
});

/* -------------------------------------------------------------------------- */
/* decideVerdict                                                              */
/* -------------------------------------------------------------------------- */

test("decideVerdict: 1 件でも breach → abolish", () => {
  const metrics = [{ breached: false }, { breached: true }, { breached: null }];
  assert.equal(decideVerdict(metrics), "abolish");
});

test("decideVerdict: 全 PASS かつ全計測 → phase2", () => {
  const metrics = [{ breached: false }, { breached: false }];
  assert.equal(decideVerdict(metrics), "phase2");
});

test("decideVerdict: breach なし + 未計測あり → inconclusive", () => {
  const metrics = [{ breached: false }, { breached: null }];
  assert.equal(decideVerdict(metrics), "inconclusive");
});

/* -------------------------------------------------------------------------- */
/* formatReport (journey AC: stdout に 5 行)                                  */
/* -------------------------------------------------------------------------- */

test("formatReport: 5 指標が各 1 行で出力される", () => {
  const m = evaluateMetrics(
    baseInput({
      genStats: { total: 0, success: 0, rate: null },
      claudeCostYen: 0,
      indexedCount: 0,
      build: { ok: true, totalCiFailures: 5, pipelineAttributable: 1 },
    }),
  );
  const verdict = decideVerdict(m);
  const report = formatReport(m, { since: "2026-05-13", verdict });
  // 各指標行は "N. ラベル:" 形式
  const metricLines = report.split("\n").filter((l) => /^[1-5]\. /.test(l));
  assert.equal(
    metricLines.length,
    5,
    `expected 5 metric lines, got ${metricLines.length}\n${report}`,
  );
  assert.ok(report.includes("記事生成成功率"));
  assert.ok(report.includes("生成記事インデックス"));
  assert.ok(report.includes("判定:"));
});

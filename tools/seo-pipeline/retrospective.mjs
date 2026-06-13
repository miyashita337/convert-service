#!/usr/bin/env node
// SEO MVP: 2 週間運用後の撤退基準集計 (Epic #320 Sub 7 / #327)
//
// 使い方:
//   node tools/seo-pipeline/retrospective.mjs --since 2026-05-13 \
//     [--drafts-dir docs/articles/seo-drafts] \
//     [--claude-cost-yen <n>] [--indexed-count <n>] \
//     [--hitl-approved <n>] [--hitl-total <n>] [--json]
//
// 5 指標 (撤退基準) を可能な範囲で機械集計する:
//   1. 記事生成成功率   ... seo-drafts/<date>/ の outline.md 生成率 (run ログ代替)
//   2. HITL 承認率      ... 機械ログ不在のため手動入力 (--hitl-approved/--hitl-total)
//   3. Claude API 料金  ... Anthropic Console 依存のため手動入力 (--claude-cost-yen)
//   4. ビルド破壊件数   ... gh run list で CI workflow 失敗を取得し、seo-pipeline を
//                          触れた commit に起因するものだけ計上 (git で属性判定)
//   5. インデックス本数 ... Search Console 依存のため手動入力 (--indexed-count)
//
// 設計方針:
//   - 外部コンソール依存 (2,5) や機械ログ不在 (3 一部) の指標は「未計測=null」を
//     明示し、推測で 0 を埋めない (サイレントフォールバック禁止)。
//   - 純粋関数 (compute*/evaluate*/format*) と IO (gh/git/fs) を分離しテスト可能にする。

import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readdirSync } from "node:fs";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

// 撤退基準しきい値 (Epic #320 / Issue #327 の表より)
export const THRESHOLDS = {
  generationSuccessRate: 0.7, // < 0.70 で breach
  hitlApprovalRate: 0.5, // < 0.50 で breach
  claudeCostYen: 15000, // 厳密 > 15000 で breach (ちょうど ¥15,000 は PASS)
  buildBreakage: 2, // >= 2 で breach (ちょうど 2 件で breach)
  minIndexedCount: 1, // この本数未満 (= 0 本) で breach
};

/* -------------------------------------------------------------------------- */
/* parseArgs                                                                  */
/* -------------------------------------------------------------------------- */

export function parseArgs(argv) {
  // --since 既定: 14 日前 (引数なしでも動くが、AC では明示指定を推奨)
  const out = {
    since: null,
    draftsDir: "docs/articles/seo-drafts",
    claudeCostYen: null,
    indexedCount: null,
    hitlApproved: null,
    hitlTotal: null,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--since") out.since = parseSinceDate(argv[++i]);
    else if (a === "--drafts-dir") out.draftsDir = argv[++i];
    else if (a === "--claude-cost-yen")
      out.claudeCostYen = parseNumber(argv[++i], "--claude-cost-yen");
    else if (a === "--indexed-count")
      out.indexedCount = parseNumber(argv[++i], "--indexed-count");
    else if (a === "--hitl-approved")
      out.hitlApproved = parseNumber(argv[++i], "--hitl-approved");
    else if (a === "--hitl-total")
      out.hitlTotal = parseNumber(argv[++i], "--hitl-total");
    else if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") return { help: true };
    else throw new Error(`Unknown argument: ${a}`);
  }
  return out;
}

function parseNumber(raw, flag) {
  const n = Number(raw);
  if (!Number.isFinite(n))
    throw new Error(`${flag} requires a number, got: ${raw}`);
  return n;
}

// --since は YYYY-MM-DD 厳密形式のみ受ける。下流の辞書順比較 (name < since /
// createdAt >= since) は形式が崩れると silent に誤集計するため早期に弾く。
export function parseSinceDate(raw) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw || ""))
    throw new Error(`--since requires YYYY-MM-DD, got: ${raw}`);
  return raw;
}

// since 省略時の既定 (today から 14 日前)。today は注入可能 (テスト用)。
export function resolveSince(since, today = new Date()) {
  if (since) return since;
  const d = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/* -------------------------------------------------------------------------- */
/* 1. 記事生成成功率 (run ログ代替: seo-drafts/<date>/outline.md)             */
/* -------------------------------------------------------------------------- */

// 純粋関数: 日付ディレクトリ一覧 (run 試行) から成功率を算出。
//   run = { date: "YYYY-MM-DD", hasOutline: bool }
export function computeGenerationStats(runs) {
  const total = runs.length;
  const success = runs.filter((r) => r.hasOutline).length;
  return {
    total,
    success,
    rate: total === 0 ? null : success / total,
  };
}

// IO: seo-drafts ディレクトリを走査し、since 以降の日付ディレクトリを run として返す。
export function listDraftRuns(draftsDir, since, projectRoot = PROJECT_ROOT) {
  const abs = resolve(projectRoot, draftsDir);
  if (!existsSync(abs)) return [];
  const runs = [];
  for (const name of readdirSync(abs)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(name)) continue;
    if (name < since) continue;
    const dayDir = resolve(abs, name);
    runs.push({
      date: name,
      hasOutline: existsSync(resolve(dayDir, "outline.md")),
      hasKeywords: existsSync(resolve(dayDir, "keywords.json")),
    });
  }
  return runs;
}

/* -------------------------------------------------------------------------- */
/* 4. ビルド破壊件数 (CI 失敗のうち seo-pipeline 起因のみ)                     */
/* -------------------------------------------------------------------------- */

// 純粋関数: 失敗 run 一覧と「commit が seo-pipeline を触れたか」判定関数から件数を算出。
//   failingRuns = [{ headSha }], touchedFn(sha) -> bool
export function attributeBuildFailures(failingRuns, touchedFn) {
  const totalCiFailures = failingRuns.length;
  let pipelineAttributable = 0;
  for (const r of failingRuns) {
    if (touchedFn(r.headSha)) pipelineAttributable++;
  }
  return { totalCiFailures, pipelineAttributable };
}

// IO: gh run list で CI workflow の失敗 run を since 以降で取得。
export function fetchFailingCiRuns(
  since,
  { workflow = "CI", limit = 100 } = {},
) {
  const r = spawnSync(
    "gh",
    [
      "run",
      "list",
      "--workflow",
      workflow,
      "--limit",
      String(limit),
      "--json",
      "conclusion,createdAt,headSha",
    ],
    { cwd: PROJECT_ROOT, encoding: "utf-8", timeout: 30000 },
  );
  if (r.status !== 0) {
    return {
      ok: false,
      error: (r.stderr || "gh run list failed").toString().trim(),
      runs: [],
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(r.stdout || "[]");
  } catch (err) {
    return {
      ok: false,
      error: `gh JSON parse error: ${err.message}`,
      runs: [],
    };
  }
  const runs = parsed
    .filter(
      (x) => x.conclusion === "failure" && x.createdAt.slice(0, 10) >= since,
    )
    .map((x) => ({ headSha: x.headSha, createdAt: x.createdAt }));
  return { ok: true, runs };
}

// IO: commit が tools/seo-pipeline/ を触れたか (local history)。未取得 commit は false。
export function makeCommitTouchedPipeline(projectRoot = PROJECT_ROOT) {
  return (sha) => {
    const exists = spawnSync("git", ["cat-file", "-e", sha], {
      cwd: projectRoot,
      timeout: 10000,
    });
    if (exists.status !== 0) return false; // local に無い commit は判定不能 → 計上しない
    const show = spawnSync(
      "git",
      [
        "show",
        "--stat",
        "--name-only",
        "--format=",
        sha,
        "--",
        "tools/seo-pipeline/",
      ],
      { cwd: projectRoot, encoding: "utf-8", timeout: 10000 },
    );
    // git show が異常終了したら「触れていない」と誤計上せず、警告して保守的に false。
    if (show.status !== 0) {
      console.error(
        JSON.stringify({
          level: "warn",
          msg: "git show failed; treating commit as non-pipeline",
          sha,
          status: show.status,
        }),
      );
      return false;
    }
    return (show.stdout || "").trim().length > 0;
  };
}

/* -------------------------------------------------------------------------- */
/* 指標評価 + 判定                                                            */
/* -------------------------------------------------------------------------- */

// 純粋関数: 各指標を {value, breached(true/false/null), note} に評価する。
//   breached=null は「未計測」(外部コンソール依存 or 機械ログ不在)。
export function evaluateMetrics(input) {
  const { genStats, hitl, claudeCostYen, build, indexedCount } = input;

  // 1. 記事生成成功率
  let gen;
  if (genStats.total === 0) {
    gen = {
      value: null,
      breached: true,
      note: "2週間で run 0 件 (生成ドラフトなし=未運用)。生成パイプラインの目的を達成できていない",
    };
  } else {
    const r = genStats.rate;
    gen = {
      value: r,
      breached: r < THRESHOLDS.generationSuccessRate,
      note: `${genStats.success}/${genStats.total} 件で outline.md 生成`,
    };
  }

  // 2. HITL 承認率 (手動入力。両方そろわなければ未計測)
  let hitlMetric;
  if (hitl && hitl.total != null && hitl.total > 0 && hitl.approved != null) {
    const r = hitl.approved / hitl.total;
    hitlMetric = {
      value: r,
      breached: r < THRESHOLDS.hitlApprovalRate,
      note: `${hitl.approved}/${hitl.total} 件承認 (手動入力)`,
    };
  } else {
    hitlMetric = {
      value: null,
      breached: null,
      note: "機械ログ不在。--hitl-approved/--hitl-total 未指定。pipeline 経由公開記事は 0 件と推定",
    };
  }

  // 3. Claude API 料金 (Anthropic Console 依存=手動)
  let cost;
  if (claudeCostYen != null) {
    cost = {
      value: claudeCostYen,
      breached: claudeCostYen > THRESHOLDS.claudeCostYen,
      note: `Anthropic Console 実績 (手動入力) ¥${claudeCostYen.toLocaleString("ja-JP")}`,
    };
  } else {
    cost = {
      value: null,
      breached: null,
      note: "Anthropic Console 依存。--claude-cost-yen 未指定。MVP は deterministic で LLM 非使用のため ≈¥0 と推定",
    };
  }

  // 4. ビルド破壊件数 (seo-pipeline 起因)
  const buildMetric = {
    value: build.pipelineAttributable,
    breached: build.ok
      ? build.pipelineAttributable >= THRESHOLDS.buildBreakage
      : null,
    note: build.ok
      ? `CI 失敗 ${build.totalCiFailures} 件中 seo-pipeline 起因 ${build.pipelineAttributable} 件`
      : `gh 取得失敗: ${build.error}`,
  };

  // 5. インデックス本数 (Search Console 依存=手動)
  let indexed;
  if (indexedCount != null) {
    indexed = {
      value: indexedCount,
      breached: indexedCount < THRESHOLDS.minIndexedCount,
      note: `Search Console 実績 (手動入力) ${indexedCount} 本`,
    };
  } else {
    indexed = {
      value: null,
      breached: null,
      note: "Search Console 依存。--indexed-count 未指定。pipeline 生成記事は 0 本のため indexed=0 と推定",
    };
  }

  return [
    { id: 1, key: "generationSuccessRate", label: "記事生成成功率", ...gen },
    { id: 2, key: "hitlApprovalRate", label: "HITL承認率", ...hitlMetric },
    { id: 3, key: "claudeCostYen", label: "Claude API料金", ...cost },
    { id: 4, key: "buildBreakage", label: "ビルド破壊件数", ...buildMetric },
    { id: 5, key: "indexedCount", label: "生成記事インデックス", ...indexed },
  ];
}

// 純粋関数: ADR-006 §3 ルール (1 件でも breach → 廃止 / 全 PASS かつ全計測 → Phase2)。
export function decideVerdict(metrics) {
  const anyBreached = metrics.some((m) => m.breached === true);
  if (anyBreached) return "abolish";
  const anyUnmeasured = metrics.some((m) => m.breached === null);
  if (anyUnmeasured) return "inconclusive";
  return "phase2";
}

const VERDICT_LABEL = {
  abolish: "廃止 (撤退 ADR を書く)",
  phase2: "Phase2 拡張 (別 ADR 化)",
  inconclusive: "判定不能 (未計測指標あり → 現状維持で再計測)",
};

/* -------------------------------------------------------------------------- */
/* レポート整形                                                               */
/* -------------------------------------------------------------------------- */

function fmtValue(m) {
  if (m.value == null) return "N/A";
  if (m.key === "generationSuccessRate" || m.key === "hitlApprovalRate") {
    return `${(m.value * 100).toFixed(1)}%`;
  }
  if (m.key === "claudeCostYen") return `¥${m.value.toLocaleString("ja-JP")}`;
  return String(m.value);
}

function fmtBreach(b) {
  if (b === true) return "BREACH";
  if (b === false) return "PASS";
  return "未計測";
}

// 純粋関数: 5 指標を各 1 行で整形 (journey AC: stdout に 5 行)。
export function formatReport(metrics, meta) {
  const lines = [];
  lines.push(`# SEO MVP 撤退基準レポート (since ${meta.since})`);
  lines.push("");
  for (const m of metrics) {
    lines.push(
      `${m.id}. ${m.label}: ${fmtValue(m)} [${fmtBreach(m.breached)}] — ${m.note}`,
    );
  }
  lines.push("");
  lines.push(`判定: ${VERDICT_LABEL[meta.verdict]}`);
  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/* main (IO)                                                                  */
/* -------------------------------------------------------------------------- */

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }
  if (args.help) {
    console.log(
      "Usage: node tools/seo-pipeline/retrospective.mjs --since YYYY-MM-DD [--drafts-dir <dir>] [--claude-cost-yen <n>] [--indexed-count <n>] [--hitl-approved <n>] [--hitl-total <n>] [--json]",
    );
    process.exit(0);
  }

  const since = resolveSince(args.since);

  // 1. 記事生成成功率
  const runs = listDraftRuns(args.draftsDir, since);
  const genStats = computeGenerationStats(runs);

  // 4. ビルド破壊件数
  const fetched = fetchFailingCiRuns(since);
  let build;
  if (fetched.ok) {
    const touched = makeCommitTouchedPipeline();
    build = { ok: true, ...attributeBuildFailures(fetched.runs, touched) };
  } else {
    build = {
      ok: false,
      error: fetched.error,
      totalCiFailures: null,
      pipelineAttributable: null,
    };
  }

  const metrics = evaluateMetrics({
    genStats,
    hitl: { approved: args.hitlApproved, total: args.hitlTotal },
    claudeCostYen: args.claudeCostYen,
    build,
    indexedCount: args.indexedCount,
  });
  const verdict = decideVerdict(metrics);
  const meta = { since, verdict };

  if (args.json) {
    console.log(JSON.stringify({ meta, metrics }, null, 2));
  } else {
    console.log(formatReport(metrics, meta));
  }
}

// 直接実行時のみ main() を起動 (test import 時は起動しない)。
// process.argv[1] の path 表現差異 (Windows の \) を吸収するため fileURLToPath で正規化。
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}

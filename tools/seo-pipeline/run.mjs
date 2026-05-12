#!/usr/bin/env node
// SEO MVP: 3 段オーケストレーター (Sub 3 → Sub 4 → Sub 5)
//
// 使い方:
//   node tools/seo-pipeline/run.mjs --keyword "WebP 変換" \
//     [--url <competitor-url>...] [--urls-from <file>] [--out <dir>]
//
// 実行順序 (逐次、依存関係あり):
//   1. keyword-research.mjs    --seed <keyword>
//   2. competitor-analysis.mjs --keyword <keyword> --url ... (URL なければ skip 警告)
//   3. outline-generator.mjs   --keyword <keyword> --keywords-file --competitor-file
//
// 予算 cap (MAX_CLAUDE_TOKENS_PER_RUN):
//   - outline-generator が cap 超過すると exit 1
//   - 超過時は Pushover 通知 ($HOME/.claude/scripts/pushover-notify.sh) を best-effort で送る

import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

export function parseArgs(argv) {
  let keyword = null;
  const urls = [];
  let urlsFrom = null;
  let outDir = "docs/articles/seo-drafts";
  let skipKeyword = false;
  let skipCompetitor = false;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--keyword") keyword = argv[++i];
    else if (a === "--url") urls.push(argv[++i]);
    else if (a === "--urls-from") urlsFrom = argv[++i];
    else if (a === "--out") outDir = argv[++i];
    else if (a === "--skip-keyword") skipKeyword = true;
    else if (a === "--skip-competitor") skipCompetitor = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--help" || a === "-h") return { help: true };
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!keyword) throw new Error("--keyword is required");
  return { keyword, urls, urlsFrom, outDir, skipKeyword, skipCompetitor, dryRun };
}

function runStep(name, scriptPath, args, env = process.env) {
  console.error(
    JSON.stringify({ level: "info", msg: `run.mjs: ${name} start`, args }),
  );
  const r = spawnSync("node", [scriptPath, ...args], {
    cwd: PROJECT_ROOT,
    env,
    stdio: ["ignore", "inherit", "inherit"],
  });
  if (r.status !== 0) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: `run.mjs: ${name} failed`,
        exit_code: r.status,
      }),
    );
    return { ok: false, status: r.status };
  }
  return { ok: true, status: 0 };
}

function notifyPushover(title, message) {
  const homeScript = `${process.env.HOME}/.claude/scripts/pushover-notify.sh`;
  if (!existsSync(homeScript)) return;
  try {
    spawnSync("bash", [homeScript, title, message], {
      stdio: "ignore",
      timeout: 5000,
    });
  } catch {
    /* best-effort */
  }
}

export function findGeneratedFile(outDir, fileName, today = new Date()) {
  const day = today.toISOString().slice(0, 10);
  const filePath = resolve(PROJECT_ROOT, outDir, day, fileName);
  return existsSync(filePath) ? filePath : null;
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }
  if (parsed.help) {
    console.log(
      "Usage: node tools/seo-pipeline/run.mjs --keyword <kw> [--url <url>...] [--urls-from <file>] [--out <dir>] [--skip-keyword] [--skip-competitor]",
    );
    process.exit(0);
  }

  const { keyword, urls, urlsFrom, outDir } = parsed;
  const cap = parseInt(process.env.MAX_CLAUDE_TOKENS_PER_RUN || "0", 10);
  console.error(
    JSON.stringify({
      level: "info",
      msg: "run.mjs: pipeline start",
      keyword,
      url_count: urls.length,
      urls_from: urlsFrom,
      out: outDir,
      budget_cap: cap || null,
    }),
  );

  const today = new Date();

  // Step 1: keyword research
  if (!parsed.skipKeyword) {
    const r1 = runStep("keyword-research", resolve(__dirname, "keyword-research.mjs"), [
      "--seed",
      keyword,
      "--out",
      outDir,
    ]);
    if (!r1.ok) {
      notifyPushover("SEO pipeline FAIL", `keyword-research exit ${r1.status} for "${keyword}"`);
      process.exit(r1.status);
    }
  }

  // Step 2: competitor analysis (URL あれば実行、なければ skip + warn)
  if (!parsed.skipCompetitor) {
    if (urls.length === 0 && !urlsFrom) {
      console.error(
        JSON.stringify({
          level: "warn",
          msg: "no URLs provided, skipping competitor-analysis (outline 品質が下がる可能性)",
        }),
      );
    } else {
      const compArgs = ["--keyword", keyword, "--out", outDir];
      for (const u of urls) compArgs.push("--url", u);
      if (urlsFrom) compArgs.push("--urls-from", urlsFrom);
      const r2 = runStep(
        "competitor-analysis",
        resolve(__dirname, "competitor-analysis.mjs"),
        compArgs,
      );
      if (!r2.ok) {
        notifyPushover(
          "SEO pipeline FAIL",
          `competitor-analysis exit ${r2.status} for "${keyword}"`,
        );
        process.exit(r2.status);
      }
    }
  }

  // Step 3: outline generator
  const keywordsFile = findGeneratedFile(outDir, "keywords.json", today);
  if (!keywordsFile) {
    console.error(JSON.stringify({ level: "error", msg: "keywords.json not found" }));
    process.exit(2);
  }
  const competitorFile =
    findGeneratedFile(outDir, "competitive_analysis.json", today) ||
    writeEmptyCompetitorFile(outDir, keyword, today);

  const r3 = runStep("outline-generator", resolve(__dirname, "outline-generator.mjs"), [
    "--keyword",
    keyword,
    "--keywords-file",
    keywordsFile,
    "--competitor-file",
    competitorFile,
    "--out",
    outDir,
  ]);
  if (!r3.ok) {
    notifyPushover("SEO pipeline FAIL", `outline-generator exit ${r3.status} for "${keyword}"`);
    process.exit(r3.status);
  }

  const outlinePath = findGeneratedFile(outDir, "outline.md", today);
  console.error(
    JSON.stringify({
      level: "info",
      msg: "run.mjs: pipeline done",
      outline: outlinePath,
      keywords: keywordsFile,
      competitor: competitorFile,
    }),
  );
}

function writeEmptyCompetitorFile(outDir, keyword, today) {
  const day = today.toISOString().slice(0, 10);
  const path = resolve(PROJECT_ROOT, outDir, day, "competitive_analysis.json");
  if (existsSync(path)) return path;
  const payload = {
    version: "1",
    generated_at: today.toISOString(),
    meta: { keyword, url_count: 0, sandbox_applied: true, source: "manual-urls" },
    competitive_analysis: [],
  };
  mkdirSync(resolve(PROJECT_ROOT, outDir, day), { recursive: true });
  writeFileSync(path, JSON.stringify(payload, null, 2) + "\n", "utf-8");
  return path;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

#!/usr/bin/env node
// SEO MVP: 構成案生成 (deterministic、template-based)
//
// Sub 3 (keywords.json) と Sub 4 (competitive_analysis.json) を入力に outline.md を生成。
// MVP では LLM を呼ばず、決定的なマージで構成案を組み立てる。後続で LLM polish を入れる余地あり。
//
// 使い方:
//   node tools/seo-pipeline/outline-generator.mjs \
//     --keyword "WebP 変換" \
//     --keywords-file docs/articles/seo-drafts/2026-05-13/keywords.json \
//     --competitor-file docs/articles/seo-drafts/2026-05-13/competitive_analysis.json \
//     [--out <dir>]

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

/* -------------------------------------------------------------------------- */
/* CLI parser                                                                 */
/* -------------------------------------------------------------------------- */

export function parseArgs(argv) {
  let keyword = null;
  let keywordsFile = null;
  let competitorFile = null;
  let outDir = "docs/articles/seo-drafts";
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--keyword") keyword = argv[++i];
    else if (a === "--keywords-file") keywordsFile = argv[++i];
    else if (a === "--competitor-file") competitorFile = argv[++i];
    else if (a === "--out") outDir = argv[++i];
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--help" || a === "-h") return { help: true };
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!keyword) throw new Error("--keyword is required");
  if (!keywordsFile) throw new Error("--keywords-file is required");
  if (!competitorFile) throw new Error("--competitor-file is required");
  return { keyword, keywordsFile, competitorFile, outDir, dryRun };
}

/* -------------------------------------------------------------------------- */
/* input loaders                                                              */
/* -------------------------------------------------------------------------- */

export function loadJsonFile(filePath) {
  if (!existsSync(filePath)) throw new Error(`file not found: ${filePath}`);
  const raw = readFileSync(filePath, "utf-8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`invalid JSON in ${filePath}: ${err.message}`);
  }
}

/* -------------------------------------------------------------------------- */
/* outline composition                                                        */
/* -------------------------------------------------------------------------- */

// keywords を score 降順で N 件取得 (seed を除外することも可)
function topKeywords(kwData, n = 8) {
  const list = Array.isArray(kwData?.keywords) ? kwData.keywords : [];
  return list
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, n);
}

// competitor H2 の出現頻度を集計、上位 N 件
function topCompetitorHeadings(compData, level = 2, n = 6) {
  const list = Array.isArray(compData?.competitive_analysis) ? compData.competitive_analysis : [];
  const freq = new Map();
  for (const entry of list) {
    if (entry.status !== "ok" || !Array.isArray(entry.headings)) continue;
    for (const h of entry.headings) {
      if (h.level !== level || !h.text) continue;
      const key = h.text.toLowerCase();
      const obj = freq.get(key) || { text: h.text, count: 0 };
      obj.count += 1;
      freq.set(key, obj);
    }
  }
  return Array.from(freq.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function composeOutline({ keyword, keywordsData, competitorData, now = () => new Date() }) {
  if (!keyword || typeof keyword !== "string") {
    throw new Error("keyword is required");
  }
  const topKws = topKeywords(keywordsData, 8);
  const topH2 = topCompetitorHeadings(competitorData, 2, 6);
  const topH3 = topCompetitorHeadings(competitorData, 3, 8);
  const fallback = keywordsData?.meta?.fallback === true;
  const compCount = (competitorData?.competitive_analysis || []).filter((c) => c.status === "ok")
    .length;
  const totalComp = (competitorData?.competitive_analysis || []).length;

  const date = now().toISOString().slice(0, 10);
  const lines = [];
  lines.push(`# ${keyword} の完全ガイド (構成案 draft)`);
  lines.push("");
  lines.push("<!--");
  lines.push(`generated_at: ${now().toISOString()}`);
  lines.push(`keyword: ${keyword}`);
  lines.push(`keywords_source: ${keywordsData?.meta?.source || "unknown"} (fallback=${fallback})`);
  lines.push(`competitor_pages: ${compCount}/${totalComp}`);
  lines.push("-->");
  lines.push("");

  lines.push("## はじめに (TL;DR)");
  lines.push("");
  lines.push(`- 想定読者: ${keyword} を検索する読者層`);
  lines.push(`- 提示する解決策: QuickConv での 1 クリック変換`);
  lines.push("- 期待する読了時間: 3 分以内");
  lines.push("");

  lines.push("## このキーワードで競合が押さえている観点");
  lines.push("");
  if (topH2.length > 0) {
    for (const h of topH2) {
      lines.push(`- ${h.text} (競合 ${h.count} 件で言及)`);
    }
  } else {
    lines.push("- 競合データなし。手動で論点を整理してください。");
  }
  lines.push("");

  // Top-level structure
  for (let i = 0; i < topH2.length; i++) {
    const h = topH2[i];
    lines.push(`## ${h.text}`);
    lines.push("");
    lines.push(`> 競合の ${h.count} 件で言及。本記事では QuickConv の文脈で再構成する。`);
    lines.push("");
    // Add some H3 sub-points by rotating from topH3
    const subPick = topH3.slice(i * 2, i * 2 + 2);
    for (const sh of subPick) {
      lines.push(`### ${sh.text}`);
      lines.push("");
      lines.push("- TODO: 具体例・データ・実機スクショ");
      lines.push("");
    }
  }

  // Always add a QuickConv-specific section
  lines.push("## QuickConv での実例");
  lines.push("");
  lines.push("- 操作手順 (実機スクショ TODO)");
  lines.push("- 変換時間ベンチマーク (実測値 TODO)");
  lines.push("- 競合との比較表");
  lines.push("");

  lines.push("## まとめ");
  lines.push("");
  lines.push(`- ${keyword} は ${compCount} 件の競合が押さえる重要テーマ`);
  lines.push("- QuickConv は 24h 自動削除 / WebP / AVIF / HEIC 対応で差別化");
  lines.push("- 次のアクション: quickconv.cc で実際に試す");
  lines.push("");

  lines.push("## 参考: 関連キーワード");
  lines.push("");
  for (const kw of topKws) {
    lines.push(`- ${kw.keyword} (score=${kw.score ?? 0}, source=${kw.source})`);
  }
  lines.push("");

  lines.push("<!--");
  lines.push(`outline.md draft generated by tools/seo-pipeline/outline-generator.mjs`);
  lines.push(`date: ${date}`);
  lines.push("-->");
  lines.push("");

  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/* budget cap (rough token estimator)                                          */
/* -------------------------------------------------------------------------- */

// Rough token = chars / 4 (英語) または chars / 2 (日本語含む)
export function estimateTokens(text) {
  if (typeof text !== "string") return 0;
  const hasJa = /[぀-ヿ一-龯]/.test(text);
  const divisor = hasJa ? 2 : 4;
  return Math.ceil(text.length / divisor);
}

/* -------------------------------------------------------------------------- */
/* output writer                                                              */
/* -------------------------------------------------------------------------- */

export function writeOutline(markdown, outDir, { now = () => new Date() } = {}) {
  const day = now().toISOString().slice(0, 10);
  const dir = resolve(PROJECT_ROOT, outDir, day);
  mkdirSync(dir, { recursive: true });
  const filePath = resolve(dir, "outline.md");
  writeFileSync(filePath, markdown, "utf-8");
  return filePath;
}

/* -------------------------------------------------------------------------- */
/* CLI entry                                                                  */
/* -------------------------------------------------------------------------- */

async function main() {
  const argv = process.argv.slice(2);
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }
  if (parsed.help) {
    console.log(
      "Usage: node tools/seo-pipeline/outline-generator.mjs --keyword <kw> --keywords-file <path> --competitor-file <path> [--out <dir>] [--dry-run]",
    );
    process.exit(0);
  }
  let keywordsData, competitorData;
  try {
    keywordsData = loadJsonFile(parsed.keywordsFile);
    competitorData = loadJsonFile(parsed.competitorFile);
  } catch (err) {
    console.error(JSON.stringify({ level: "error", msg: err.message }));
    process.exit(2);
  }
  const md = composeOutline({
    keyword: parsed.keyword,
    keywordsData,
    competitorData,
  });
  const estimated = estimateTokens(md);
  const cap = parseInt(process.env.MAX_CLAUDE_TOKENS_PER_RUN || "0", 10);
  if (cap > 0 && estimated > cap) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "budget cap exceeded",
        estimated_tokens: estimated,
        cap,
      }),
    );
    process.exit(1);
  }
  if (parsed.dryRun) {
    console.log(md);
    return;
  }
  const filePath = writeOutline(md, parsed.outDir);
  console.error(
    JSON.stringify({
      level: "info",
      msg: "outline-generator done",
      file: filePath,
      estimated_tokens: estimated,
    }),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

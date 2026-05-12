#!/usr/bin/env node
// SEO MVP: キーワード選定 subagent (Phase A - Search Console + 手動 seed)
//
// 使い方:
//   node tools/seo-pipeline/keyword-research.mjs --seed "WebP 変換" [--seed "AVIF 変換"] [--out <dir>]
//
// 認証 (任意): .env.seo の以下を読み込む
//   GSC_OAUTH_CLIENT_ID, GSC_OAUTH_CLIENT_SECRET, GSC_REFRESH_TOKEN, GSC_SITE_URL
//   認証エラー / 未設定時は手動 seed フォールバックで続行 (meta.fallback=true)
//
// 予算 cap (任意): MAX_CLAUDE_TOKENS_PER_RUN (本スクリプトはトークン消費しないが、生成上限の指標として尊重)
//
// 出力: <out>/<YYYY-MM-DD>/keywords.json (default <out>=docs/articles/seo-drafts)

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

/* -------------------------------------------------------------------------- */
/* env loader (.env.seo)                                                      */
/* -------------------------------------------------------------------------- */

export function loadEnvSeo(filePath = resolve(PROJECT_ROOT, "tools/seo-pipeline/.env.seo")) {
  if (!existsSync(filePath)) return {};
  const raw = readFileSync(filePath, "utf-8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* CLI argument parser                                                        */
/* -------------------------------------------------------------------------- */

export function parseArgs(argv) {
  const seeds = [];
  let outDir = "docs/articles/seo-drafts";
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--seed") {
      const v = argv[++i];
      if (!v) throw new Error("--seed requires a value");
      seeds.push(v);
    } else if (a === "--out") {
      const v = argv[++i];
      if (!v) throw new Error("--out requires a value");
      outDir = v;
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--help" || a === "-h") {
      return { help: true };
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  if (seeds.length === 0) {
    throw new Error("at least one --seed is required");
  }
  return { seeds, outDir, dryRun };
}

/* -------------------------------------------------------------------------- */
/* seed expansion (manual fallback)                                           */
/* -------------------------------------------------------------------------- */

const JP_MODIFIERS = [
  "方法",
  "やり方",
  "無料",
  "サイト",
  "オンライン",
  "コツ",
  "アプリ",
  "おすすめ",
];

const EN_MODIFIERS = [
  "free",
  "online",
  "tool",
  "best",
  "how to",
  "convert",
];

export function expandSeed(seed, { maxVariants = 8 } = {}) {
  const trimmed = seed.trim();
  if (!trimmed) return [];
  const isJa = /[぀-ヿ一-龯]/.test(trimmed);
  const modifiers = isJa ? JP_MODIFIERS : EN_MODIFIERS;
  const variants = new Set();
  variants.add(trimmed);
  for (const m of modifiers) {
    if (variants.size >= maxVariants + 1) break;
    variants.add(`${trimmed} ${m}`);
  }
  return Array.from(variants);
}

/* -------------------------------------------------------------------------- */
/* scoring                                                                    */
/* -------------------------------------------------------------------------- */

// Search Console データがあれば impressions × position-weighted CTR でスコア。
// position が低い (1 に近い) ほど高スコア。CTR データなしの場合は impressions のみ。
// フォールバック時は変動なし (0.0)。境界値: impressions=0 → score=0、position<=0 → score=0。
export function computeScore({ impressions = 0, ctr = 0, position = 0 }) {
  if (!Number.isFinite(impressions) || impressions <= 0) return 0;
  if (!Number.isFinite(position) || position <= 0) return 0;
  const positionWeight = 1 / position;
  const ctrSafe = Number.isFinite(ctr) && ctr > 0 ? ctr : 0;
  // 簡易な合成スコア。impressions × position_weight × (1 + ctr*10)
  const score = impressions * positionWeight * (1 + ctrSafe * 10);
  // 小数 4 桁丸め
  return Math.round(score * 10000) / 10000;
}

/* -------------------------------------------------------------------------- */
/* Search Console API client (OAuth2 refresh + searchAnalytics.query)          */
/* -------------------------------------------------------------------------- */

const GSC_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GSC_QUERY_URL = (siteUrl) =>
  `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl,
  )}/searchAnalytics/query`;

async function refreshAccessToken({ clientId, clientSecret, refreshToken }, { timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(GSC_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`token refresh failed: HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.access_token) throw new Error("token refresh returned no access_token");
    return data.access_token;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchSearchConsoleQueries(env, { timeoutMs = 15000 } = {}) {
  const { GSC_OAUTH_CLIENT_ID, GSC_OAUTH_CLIENT_SECRET, GSC_REFRESH_TOKEN, GSC_SITE_URL } = env;
  if (!GSC_OAUTH_CLIENT_ID || !GSC_OAUTH_CLIENT_SECRET || !GSC_REFRESH_TOKEN || !GSC_SITE_URL) {
    return null;
  }
  const accessToken = await refreshAccessToken({
    clientId: GSC_OAUTH_CLIENT_ID,
    clientSecret: GSC_OAUTH_CLIENT_SECRET,
    refreshToken: GSC_REFRESH_TOKEN,
  });
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 90);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(GSC_QUERY_URL(GSC_SITE_URL), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: fmt(startDate),
        endDate: fmt(today),
        dimensions: ["query"],
        rowLimit: 100,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`searchAnalytics.query failed: HTTP ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data.rows) ? data.rows : [];
  } finally {
    clearTimeout(t);
  }
}

/* -------------------------------------------------------------------------- */
/* schema validation                                                          */
/* -------------------------------------------------------------------------- */

export function validateKeywordsOutput(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object") {
    return ["root must be an object"];
  }
  if (obj.version !== "1") errors.push("version must be '1'");
  if (typeof obj.generated_at !== "string") errors.push("generated_at must be a string");
  if (!obj.meta || typeof obj.meta !== "object") {
    errors.push("meta must be an object");
  } else {
    if (typeof obj.meta.fallback !== "boolean") errors.push("meta.fallback must be boolean");
    if (!Array.isArray(obj.meta.seeds)) errors.push("meta.seeds must be an array");
    if (typeof obj.meta.source !== "string") errors.push("meta.source must be a string");
  }
  if (!Array.isArray(obj.keywords)) {
    errors.push("keywords must be an array");
  } else {
    obj.keywords.forEach((k, i) => {
      if (!k || typeof k !== "object") {
        errors.push(`keywords[${i}] must be an object`);
        return;
      }
      if (typeof k.keyword !== "string" || !k.keyword.trim()) {
        errors.push(`keywords[${i}].keyword must be a non-empty string`);
      }
      if (typeof k.score !== "number" || !Number.isFinite(k.score)) {
        errors.push(`keywords[${i}].score must be a finite number`);
      }
      if (typeof k.source !== "string") {
        errors.push(`keywords[${i}].source must be a string`);
      }
    });
  }
  return errors;
}

/* -------------------------------------------------------------------------- */
/* core pipeline                                                              */
/* -------------------------------------------------------------------------- */

export async function generateKeywords({ seeds, env = {}, gscFetcher = fetchSearchConsoleQueries, now = () => new Date() }) {
  if (!Array.isArray(seeds) || seeds.length === 0) {
    throw new Error("seeds must be a non-empty array");
  }
  const dedupedSeeds = Array.from(new Set(seeds.map((s) => s.trim()).filter(Boolean)));
  if (dedupedSeeds.length === 0) {
    throw new Error("seeds contained only empty strings");
  }

  let gscRows = null;
  let fallback = false;
  let source = "manual-seed";
  let warning = null;

  try {
    gscRows = await gscFetcher(env);
    if (gscRows && gscRows.length > 0) {
      source = "search-console";
    } else if (gscRows && gscRows.length === 0) {
      // GSC reachable but no data, still primary
      source = "search-console";
    } else {
      fallback = true;
    }
  } catch (err) {
    fallback = true;
    warning = err.message;
  }

  const merged = new Map();

  // seed-derived candidates
  for (const seed of dedupedSeeds) {
    for (const variant of expandSeed(seed)) {
      if (!merged.has(variant)) {
        merged.set(variant, {
          keyword: variant,
          score: 0,
          source: variant === seed ? "seed" : "expansion",
        });
      }
    }
  }

  // GSC-derived candidates
  if (gscRows && gscRows.length > 0) {
    for (const row of gscRows) {
      const kw = Array.isArray(row.keys) ? row.keys[0] : null;
      if (!kw || typeof kw !== "string") continue;
      const score = computeScore({
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      });
      const existing = merged.get(kw);
      if (existing) {
        existing.score = Math.max(existing.score, score);
        existing.search_volume = row.impressions;
        existing.ctr = row.ctr;
      } else {
        merged.set(kw, {
          keyword: kw,
          score,
          source: "search-console",
          search_volume: row.impressions,
          ctr: row.ctr,
        });
      }
    }
  }

  const keywords = Array.from(merged.values()).sort((a, b) => b.score - a.score);

  return {
    version: "1",
    generated_at: now().toISOString(),
    meta: {
      fallback,
      seeds: dedupedSeeds,
      source,
      ...(warning ? { warning } : {}),
    },
    keywords,
  };
}

/* -------------------------------------------------------------------------- */
/* output writer                                                              */
/* -------------------------------------------------------------------------- */

export function writeKeywordsOutput(payload, outDir, { now = () => new Date() } = {}) {
  const day = now().toISOString().slice(0, 10);
  const dir = resolve(PROJECT_ROOT, outDir, day);
  mkdirSync(dir, { recursive: true });
  const filePath = resolve(dir, "keywords.json");
  writeFileSync(filePath, JSON.stringify(payload, null, 2) + "\n", "utf-8");
  return filePath;
}

/* -------------------------------------------------------------------------- */
/* CLI entry point                                                            */
/* -------------------------------------------------------------------------- */

function maskSecret(v) {
  if (!v) return "(unset)";
  if (v.length <= 6) return "***";
  return `${v.slice(0, 3)}…${v.slice(-2)}`;
}

async function main() {
  const argv = process.argv.slice(2);
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    console.error("Usage: node tools/seo-pipeline/keyword-research.mjs --seed <kw> [--seed <kw>...] [--out <dir>] [--dry-run]");
    process.exit(1);
  }
  if (parsed.help) {
    console.log("Usage: node tools/seo-pipeline/keyword-research.mjs --seed <kw> [--seed <kw>...] [--out <dir>] [--dry-run]");
    process.exit(0);
  }
  const fileEnv = loadEnvSeo();
  const env = { ...fileEnv, ...process.env };

  const maxBudget = parseInt(env.MAX_CLAUDE_TOKENS_PER_RUN || "0", 10);
  console.error(
    JSON.stringify({
      level: "info",
      ts: new Date().toISOString(),
      msg: "keyword-research start",
      seeds: parsed.seeds,
      out: parsed.outDir,
      gsc_client: maskSecret(env.GSC_OAUTH_CLIENT_ID),
      gsc_site: env.GSC_SITE_URL || "(unset)",
      max_budget_tokens: maxBudget || null,
    }),
  );

  let payload;
  try {
    payload = await generateKeywords({ seeds: parsed.seeds, env });
  } catch (err) {
    console.error(JSON.stringify({ level: "error", ts: new Date().toISOString(), msg: err.message }));
    process.exit(2);
  }

  const errs = validateKeywordsOutput(payload);
  if (errs.length > 0) {
    console.error(JSON.stringify({ level: "error", ts: new Date().toISOString(), msg: "schema validation failed", errors: errs }));
    process.exit(3);
  }

  if (parsed.dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const filePath = writeKeywordsOutput(payload, parsed.outDir);
  console.error(
    JSON.stringify({
      level: "info",
      ts: new Date().toISOString(),
      msg: "keyword-research done",
      file: filePath,
      keywords_count: payload.keywords.length,
      fallback: payload.meta.fallback,
      source: payload.meta.source,
    }),
  );
}

// Run only when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

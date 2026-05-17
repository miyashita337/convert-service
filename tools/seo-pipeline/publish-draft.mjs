#!/usr/bin/env node
// SEO MVP: note/Qiita 下書き投稿 shim (HTML サニタイズゲート付き)
//
// 使い方:
//   # 既定: dry-run (実投稿なし、サニタイズ後の payload を stdout に出力)
//   node tools/seo-pipeline/publish-draft.mjs --article docs/articles/006-new.md
//
//   # 実 publish (要: tools/team_salary/.env の QIITA_API_TOKEN 等)
//   node tools/seo-pipeline/publish-draft.mjs --article ... --publish --target qiita
//
// セキュリティ:
//   - 既定 dry-run、--publish 明示なしでは投稿しない (RW-002 教訓)
//   - script / iframe / object / on*= イベント属性を除去 (XSS 防御)
//   - .env.seo と tools/team_salary/.env を分離 (RW-014)
//   - team_salary 実機 API は既存 publish-quickconv-qiita.ts 等を spawn 経由で呼ぶ
//     (本 shim 自身は team_salary を直接編集しない、submodule PR ルーチン尊重)

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

/* -------------------------------------------------------------------------- */
/* CLI                                                                        */
/* -------------------------------------------------------------------------- */

const VALID_TARGETS = new Set(["note", "qiita", "both"]);

export function parseArgs(argv) {
  let article = null;
  let publish = false;
  let target = "both";
  let noteUrl = null;
  let dryRun = false; // 既定で `--publish` 無ければ自動的に dry-run 扱い
  let update = false; // Issue #330 AC-3: 既存投稿を更新するモード
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--article") article = argv[++i];
    else if (a === "--publish") publish = true;
    else if (a === "--target") {
      target = argv[++i];
      if (!VALID_TARGETS.has(target)) {
        throw new Error(`--target must be one of: ${Array.from(VALID_TARGETS).join(", ")}`);
      }
    } else if (a === "--note-url") noteUrl = argv[++i];
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--update") update = true;
    else if (a === "--help" || a === "-h") return { help: true };
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!article) throw new Error("--article is required");
  return { article, publish, target, noteUrl, dryRun: dryRun || !publish, update };
}

/* -------------------------------------------------------------------------- */
/* update-mode helpers (Issue #330 AC-3)                                      */
/* -------------------------------------------------------------------------- */

/**
 * Pull a `platforms.<key>: "https://..."` value out of a Markdown article's
 * YAML frontmatter. The minimal frontmatter parser elsewhere in this module
 * is flat, so this helper looks for the indented child explicitly.
 *
 * Returns null when the key is absent or the value is the empty string,
 * so callers can distinguish "not configured" from "configured to <url>".
 */
export function extractPlatformUrl(md, platform) {
  if (typeof md !== "string" || typeof platform !== "string") return null;
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const yaml = m[1];
  // platforms: block — accept any indentation depth on the child line
  const re = new RegExp(`^[ \\t]+${platform}\\s*:\\s*(.*)$`, "m");
  const childMatch = yaml.match(re);
  if (!childMatch) return null;
  let val = childMatch[1].trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return val || null;
}

/** Extract the Qiita item_id from a canonical Qiita item URL. */
export function parseQiitaItemId(url) {
  if (typeof url !== "string") return null;
  const m = url.match(/^https?:\/\/qiita\.com\/[^/]+\/items\/([a-f0-9]+)\/?(?:[?#].*)?$/i);
  return m ? m[1] : null;
}

/**
 * Compose the request that would be sent to Qiita's `PATCH /api/v2/items/:id`
 * endpoint for the given article. Pure function so it can be dry-run printed
 * and unit-tested without ever touching the network.
 */
export function buildQiitaUpdateRequest({ article, body, meta, qiitaUrl }) {
  if (!qiitaUrl) {
    return { ok: false, reason: "no Qiita URL in frontmatter (platforms.qiita)" };
  }
  const itemId = parseQiitaItemId(qiitaUrl);
  if (!itemId) {
    return { ok: false, reason: `unparseable Qiita URL: ${qiitaUrl}` };
  }
  const payload = buildPayload({ article, body, meta });
  // Qiita's API expects `tags: [{name, versions: []}]` not a plain array.
  const qiitaTags = payload.tags.map((name) => ({ name, versions: [] }));
  // IMPORTANT: omit `private` so existing visibility is preserved.
  // The article on Qiita may already be published; sending `private: true`
  // would unpublish it. The new-draft path (buildPayload above) still
  // defaults private:true (RW-002); the update path is conservative and
  // does not toggle visibility implicitly.
  return {
    ok: true,
    item_id: itemId,
    method: "PATCH",
    url: `https://qiita.com/api/v2/items/${itemId}`,
    body: {
      title: payload.title,
      body: payload.body,
      tags: qiitaTags,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* frontmatter + sanitize                                                     */
/* -------------------------------------------------------------------------- */

export function parseFrontmatter(md) {
  if (typeof md !== "string") throw new Error("md must be string");
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: md };
  const yaml = m[1];
  const body = m[2];
  const meta = {};
  for (const line of yaml.split("\n")) {
    const eq = line.indexOf(":");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    meta[k] = v;
  }
  return { meta, body };
}

// 主要な XSS ベクトルを Markdown 本文から除去
// RW-002 教訓: 直公開を許さない設計なのでサニタイズは defence-in-depth
const DANGEROUS_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "applet",
  "style", // inline style sheet
  "link", // CSS injection
  "meta", // meta refresh redirect
];

export function sanitizeMarkdown(md) {
  if (typeof md !== "string") return "";
  let out = md;
  // <tag ...>...</tag> ペア除去 (case-insensitive、属性込み)
  for (const tag of DANGEROUS_TAGS) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    out = out.replace(re, "");
    // self-closing or unmatched
    const re2 = new RegExp(`<\\/?${tag}\\b[^>]*\\/?>`, "gi");
    out = out.replace(re2, "");
  }
  // on*= イベントハンドラ属性除去
  out = out.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  // javascript: URL 除去 (a / img タグ内、Markdown リンクは [text](javascript:...) も)
  out = out.replace(/javascript\s*:\s*[^\s)"']+/gi, "blocked-js:");
  return out;
}

/* -------------------------------------------------------------------------- */
/* payload builder                                                            */
/* -------------------------------------------------------------------------- */

// Frontmatter tags accept two shapes in our articles:
//   tags: "a, b, c"
//   tags: ["a", "b", "c"]
// Both should yield ["a","b","c"]. The flat parseFrontmatter stores the raw
// line value as a string, so JSON-array notation comes in as a literal string
// that needs parsing.
export function parseTagsField(raw) {
  if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean);
  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) return arr.map((s) => String(s).trim()).filter(Boolean);
    } catch {
      // fall through to comma-split
    }
  }
  return trimmed.split(",").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}

export function buildPayload({ article, body, meta }) {
  const title = (meta.title || basename(article, ".md")).slice(0, 200);
  const tags = parseTagsField(meta.tags);
  return {
    title,
    tags,
    body,
    private: true, // 既定 draft (RW-002)
  };
}

/* -------------------------------------------------------------------------- */
/* env separation guard (RW-014)                                              */
/* -------------------------------------------------------------------------- */

export function assertEnvSeparation() {
  // 本 shim が team_salary/.env を直接読まないことを保証する
  // (env は team_salary 側のサブプロセスが必要時に load する)
  return {
    note_env: existsSync(resolve(PROJECT_ROOT, "tools/team_salary/.env")),
    seo_env: existsSync(resolve(PROJECT_ROOT, "tools/seo-pipeline/.env.seo")),
  };
}

/* -------------------------------------------------------------------------- */
/* team_salary shim invocation (only on --publish)                            */
/* -------------------------------------------------------------------------- */

export function invokeTeamSalaryQiita({ articleSlug, noteUrl, isPrivate }, { runner = spawnSync } = {}) {
  const tsRoot = resolve(PROJECT_ROOT, "tools/team_salary");
  if (!existsSync(tsRoot)) {
    return { ok: false, reason: "team_salary submodule not found" };
  }
  const script = resolve(tsRoot, "scripts/publish-quickconv-qiita.ts");
  if (!existsSync(script)) {
    return { ok: false, reason: "publish-quickconv-qiita.ts not found in team_salary" };
  }
  const args = ["tsx", "scripts/publish-quickconv-qiita.ts", "--slug", articleSlug];
  if (noteUrl) args.push("--note-url", noteUrl);
  if (isPrivate) args.push("--private");
  const r = runner("npx", args, { cwd: tsRoot, stdio: "inherit", timeout: 60000 });
  if (r.status !== 0) {
    return { ok: false, reason: `qiita publish exit ${r.status}` };
  }
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* CLI entry                                                                  */
/* -------------------------------------------------------------------------- */

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
      "Usage: node tools/seo-pipeline/publish-draft.mjs --article <md-path> [--publish] [--target note|qiita|both] [--note-url <url>] [--dry-run]",
    );
    process.exit(0);
  }
  const articlePath = resolve(PROJECT_ROOT, parsed.article);
  if (!existsSync(articlePath)) {
    console.error(JSON.stringify({ level: "error", msg: "article not found", path: articlePath }));
    process.exit(2);
  }
  const raw = readFileSync(articlePath, "utf-8");
  const { meta, body: rawBody } = parseFrontmatter(raw);
  const body = sanitizeMarkdown(rawBody);
  const payload = buildPayload({ article: parsed.article, body, meta });

  const envState = assertEnvSeparation();
  console.error(
    JSON.stringify({
      level: "info",
      msg: "publish-draft start",
      article: parsed.article,
      target: parsed.target,
      publish: parsed.publish,
      dryRun: parsed.dryRun,
      title: payload.title,
      body_length: payload.body.length,
      env_state: envState,
    }),
  );

  // Issue #330 AC-3: --update mode prints the PATCH request that would be sent.
  // RW-002: actual PATCH requires --publish (HITL); --update --dry-run is safe to run automatically.
  if (parsed.update) {
    const out = { mode: parsed.dryRun ? "update-dry-run" : "update", target: parsed.target, requests: [] };
    if (parsed.target === "qiita" || parsed.target === "both") {
      const qiitaUrl = extractPlatformUrl(raw, "qiita");
      const req = buildQiitaUpdateRequest({ article: parsed.article, body, meta, qiitaUrl });
      out.requests.push({ platform: "qiita", ...req });
    }
    if (parsed.target === "note" || parsed.target === "both") {
      const noteUrlFromFrontmatter = extractPlatformUrl(raw, "note");
      out.requests.push({
        platform: "note",
        ok: false,
        reason: "note does not expose a public update API; manual update via tools/team_salary/ (Playwright). See follow-up Issue.",
        note_url: noteUrlFromFrontmatter,
      });
    }
    console.log(JSON.stringify(out, null, 2));
    if (!parsed.dryRun) {
      // Actually performing the PATCH is intentionally not yet wired up in this PR.
      // We log the intent and exit non-zero so an operator notices.
      console.error(JSON.stringify({ level: "warn", msg: "real --update PATCH not yet implemented; refused to send", advice: "review the dry-run output, then perform the PATCH manually until follow-up Issue lands" }));
      process.exit(4);
    }
    return;
  }

  // RW-002: --publish 明示なしでは投稿しない、dry-run 出力のみ
  if (parsed.dryRun) {
    console.log(JSON.stringify({ payload, target: parsed.target, mode: "dry-run" }, null, 2));
    return;
  }

  // 実投稿パス
  if (parsed.target === "qiita" || parsed.target === "both") {
    const slug = basename(parsed.article, ".md");
    const r = invokeTeamSalaryQiita({
      articleSlug: slug,
      noteUrl: parsed.noteUrl,
      isPrivate: true, // 常に draft
    });
    if (!r.ok) {
      console.error(JSON.stringify({ level: "error", msg: "qiita publish failed", reason: r.reason }));
      process.exit(3);
    }
  }
  if (parsed.target === "note" || parsed.target === "both") {
    console.error(
      JSON.stringify({
        level: "warn",
        msg: "note publish via team_salary はまだ shim 未実装、手動で `tools/team_salary` 側スクリプトを使うこと",
      }),
    );
  }
  console.error(JSON.stringify({ level: "info", msg: "publish-draft done" }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

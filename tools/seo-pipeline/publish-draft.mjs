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
    else if (a === "--help" || a === "-h") return { help: true };
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!article) throw new Error("--article is required");
  return { article, publish, target, noteUrl, dryRun: dryRun || !publish };
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

export function buildPayload({ article, body, meta }) {
  const title = (meta.title || basename(article, ".md")).slice(0, 200);
  const tags = typeof meta.tags === "string" ? meta.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
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

// node --test tools/seo-pipeline/__tests__/run.test.mjs
//
// Issue #325 run.mjs E2E + budget cap test

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, rmSync } from "node:fs";

import { parseArgs, findGeneratedFile } from "../run.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../..");
const RUN_MJS = resolve(__dirname, "../run.mjs");

test("parseArgs: --keyword 必須", () => {
  assert.throws(() => parseArgs([]), /--keyword is required/);
});

test("parseArgs: 単純引数", () => {
  const r = parseArgs(["--keyword", "x"]);
  assert.equal(r.keyword, "x");
  assert.deepEqual(r.urls, []);
});

test("parseArgs: 複数 URL + skip flags", () => {
  const r = parseArgs([
    "--keyword",
    "x",
    "--url",
    "a",
    "--url",
    "b",
    "--skip-keyword",
    "--skip-competitor",
  ]);
  assert.deepEqual(r.urls, ["a", "b"]);
  assert.equal(r.skipKeyword, true);
  assert.equal(r.skipCompetitor, true);
});

test("findGeneratedFile: 存在しないファイルで null", () => {
  const r = findGeneratedFile("nonexistent-out-dir-xyz", "outline.md");
  assert.equal(r, null);
});

/* E2E (real process spawn) */

test("E2E: 3 段順次実行で outline.md 生成 (AC-1/AC-2)", () => {
  const tmpOut = `tmp-test-out-${Date.now()}`;
  const tmpDir = resolve(PROJECT_ROOT, tmpOut);
  try {
    const r = spawnSync("node", [RUN_MJS, "--keyword", "WebP 変換", "--out", tmpOut], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, MAX_CLAUDE_TOKENS_PER_RUN: "" },
      stdio: "pipe",
      timeout: 30000,
    });
    assert.equal(r.status, 0, `exit code ${r.status}, stderr=${r.stderr?.toString()}`);
    const today = new Date().toISOString().slice(0, 10);
    const outlinePath = resolve(tmpDir, today, "outline.md");
    assert.ok(existsSync(outlinePath), `outline.md not found at ${outlinePath}`);
    const md = readFileSync(outlinePath, "utf-8");
    const lines = md.split("\n").length;
    const h2 = (md.match(/^## /gm) || []).length;
    assert.ok(lines >= 30, `outline lines ${lines} < 30`);
    assert.ok(h2 >= 5, `H2 count ${h2} < 5`);
  } finally {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
});

test("E2E: MAX_CLAUDE_TOKENS_PER_RUN cap 超過で exit 1 (AC-3)", () => {
  const tmpOut = `tmp-cap-test-${Date.now()}`;
  const tmpDir = resolve(PROJECT_ROOT, tmpOut);
  try {
    const r = spawnSync("node", [RUN_MJS, "--keyword", "WebP 変換", "--out", tmpOut], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, MAX_CLAUDE_TOKENS_PER_RUN: "10" },
      stdio: "pipe",
      timeout: 30000,
    });
    assert.equal(r.status, 1, `expected exit 1, got ${r.status}, stderr=${r.stderr?.toString()}`);
    const stderr = r.stderr?.toString() || "";
    assert.ok(
      stderr.includes("budget cap exceeded"),
      `expected 'budget cap exceeded' in stderr: ${stderr.slice(0, 300)}`,
    );
  } finally {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
});

test("E2E: --skip-keyword + --skip-competitor で outline 生成失敗 (前提ファイル不在)", () => {
  const tmpOut = `tmp-skip-${Date.now()}`;
  const tmpDir = resolve(PROJECT_ROOT, tmpOut);
  try {
    const r = spawnSync(
      "node",
      [
        RUN_MJS,
        "--keyword",
        "x",
        "--out",
        tmpOut,
        "--skip-keyword",
        "--skip-competitor",
      ],
      {
        cwd: PROJECT_ROOT,
        env: { ...process.env, MAX_CLAUDE_TOKENS_PER_RUN: "" },
        stdio: "pipe",
        timeout: 15000,
      },
    );
    // Both deps skipped → keywords.json missing → exit code 非 0
    assert.notEqual(r.status, 0);
  } finally {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
});

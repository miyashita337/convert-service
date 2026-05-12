// node --test tools/seo-pipeline/__tests__/publish-draft.test.mjs
//
// Issue #326 のユニットテスト:
// - parseArgs: --article 必須、--publish default false、--target enum
// - parseFrontmatter: YAML frontmatter 抽出
// - sanitizeMarkdown: <script>, <iframe>, on*= 等の XSS ベクトル除去 (AC-2)
// - buildPayload: private:true がデフォルト (AC-3)
// - assertEnvSeparation: env 状態の透明性
// - invokeTeamSalaryQiita: runner mock で submodule 不在時の挙動

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseArgs,
  parseFrontmatter,
  sanitizeMarkdown,
  buildPayload,
  assertEnvSeparation,
  invokeTeamSalaryQiita,
} from "../publish-draft.mjs";

/* parseArgs */

test("parseArgs: --article 必須", () => {
  assert.throws(() => parseArgs([]), /--article is required/);
});

test("parseArgs: --publish なければ dryRun=true (AC-3)", () => {
  const r = parseArgs(["--article", "x.md"]);
  assert.equal(r.publish, false);
  assert.equal(r.dryRun, true, "publish なしは自動的に dry-run 扱い");
});

test("parseArgs: --publish 指定で publish=true、dryRun=false", () => {
  const r = parseArgs(["--article", "x.md", "--publish"]);
  assert.equal(r.publish, true);
  assert.equal(r.dryRun, false);
});

test("parseArgs: --target enum 検証", () => {
  assert.throws(() =>
    parseArgs(["--article", "x.md", "--target", "twitter"]),
  );
  const r = parseArgs(["--article", "x.md", "--target", "qiita"]);
  assert.equal(r.target, "qiita");
});

test("parseArgs: --note-url を保持", () => {
  const r = parseArgs(["--article", "x.md", "--note-url", "https://note.example/x"]);
  assert.equal(r.noteUrl, "https://note.example/x");
});

/* parseFrontmatter */

test("parseFrontmatter: YAML を抽出", () => {
  const md = "---\ntitle: Hello\ntags: a, b, c\n---\nbody here";
  const r = parseFrontmatter(md);
  assert.equal(r.meta.title, "Hello");
  assert.equal(r.meta.tags, "a, b, c");
  assert.equal(r.body, "body here");
});

test("parseFrontmatter: frontmatter なしは meta 空 + body そのまま", () => {
  const r = parseFrontmatter("# title\nbody");
  assert.deepEqual(r.meta, {});
  assert.equal(r.body, "# title\nbody");
});

test("parseFrontmatter: クォート付き値", () => {
  const r = parseFrontmatter(`---\ntitle: "Quoted Title"\n---\nbody`);
  assert.equal(r.meta.title, "Quoted Title");
});

/* sanitizeMarkdown — AC-2 */

test("sanitizeMarkdown: <script>...</script> を除去", () => {
  const r = sanitizeMarkdown("safe <script>alert(1)</script> rest");
  assert.ok(!r.includes("<script>"));
  assert.ok(!r.includes("</script>"));
  assert.ok(!r.includes("alert(1)"));
});

test("sanitizeMarkdown: <iframe> 除去", () => {
  const r = sanitizeMarkdown("text <iframe src='evil'></iframe> end");
  assert.ok(!r.includes("<iframe"));
  assert.ok(!r.includes("</iframe>"));
});

test("sanitizeMarkdown: self-closing 不正タグ除去", () => {
  const r = sanitizeMarkdown('<script src="evil.js" />');
  assert.ok(!r.includes("<script"));
});

test("sanitizeMarkdown: <object>, <embed>, <applet>, <style>, <link>, <meta>", () => {
  const tags = ["object", "embed", "applet", "style", "link", "meta"];
  for (const t of tags) {
    const r = sanitizeMarkdown(`text <${t}>x</${t}> end`);
    assert.ok(!r.includes(`<${t}>`), `<${t}> should be removed`);
  }
});

test("sanitizeMarkdown: on*= イベントハンドラ属性除去", () => {
  const r = sanitizeMarkdown('<a href="x" onclick="alert(1)">link</a>');
  assert.ok(!r.toLowerCase().includes("onclick"));
});

test("sanitizeMarkdown: javascript: URL は無害化", () => {
  const r = sanitizeMarkdown('[click](javascript:alert(1))');
  assert.ok(!r.includes("javascript:alert"));
  assert.ok(r.includes("blocked-js"));
});

test("sanitizeMarkdown: 正常な Markdown は変更しない", () => {
  const md = "# Title\n\n**bold** [link](https://example.com)\n\n```js\nconst x = 1;\n```";
  assert.equal(sanitizeMarkdown(md), md);
});

test("sanitizeMarkdown: 非文字列は空文字", () => {
  assert.equal(sanitizeMarkdown(null), "");
  assert.equal(sanitizeMarkdown(undefined), "");
});

/* buildPayload — AC-3 */

test("buildPayload: private は常に true (AC-3 default draft)", () => {
  const p = buildPayload({
    article: "001-tech-stack.md",
    body: "body",
    meta: { title: "T", tags: "a, b" },
  });
  assert.equal(p.private, true);
});

test("buildPayload: title 欠落時はファイル名から推測", () => {
  const p = buildPayload({ article: "foo/bar/006-zero.md", body: "x", meta: {} });
  assert.equal(p.title, "006-zero");
});

test("buildPayload: tags は配列化", () => {
  const p = buildPayload({
    article: "x.md",
    body: "x",
    meta: { tags: "a, b, c" },
  });
  assert.deepEqual(p.tags, ["a", "b", "c"]);
});

test("buildPayload: title が長すぎる場合 200 chars に切り詰め", () => {
  const long = "x".repeat(300);
  const p = buildPayload({ article: "x.md", body: "x", meta: { title: long } });
  assert.equal(p.title.length, 200);
});

/* assertEnvSeparation */

test("assertEnvSeparation: 状態を返す", () => {
  const r = assertEnvSeparation();
  assert.ok(typeof r.note_env === "boolean");
  assert.ok(typeof r.seo_env === "boolean");
});

/* invokeTeamSalaryQiita — submodule 不在 / mock */

test("invokeTeamSalaryQiita: runner mock で success", () => {
  let calledArgs = null;
  const mockRunner = (cmd, args) => {
    calledArgs = { cmd, args };
    return { status: 0 };
  };
  const r = invokeTeamSalaryQiita(
    { articleSlug: "001-tech-stack", noteUrl: "https://x", isPrivate: true },
    { runner: mockRunner },
  );
  assert.equal(r.ok, true);
  assert.ok(calledArgs.args.includes("--slug"));
  assert.ok(calledArgs.args.includes("001-tech-stack"));
  assert.ok(calledArgs.args.includes("--private"));
  assert.ok(calledArgs.args.includes("--note-url"));
});

test("invokeTeamSalaryQiita: runner が非 0 を返したら ok=false", () => {
  const r = invokeTeamSalaryQiita(
    { articleSlug: "x", isPrivate: true },
    { runner: () => ({ status: 1 }) },
  );
  assert.equal(r.ok, false);
  assert.ok(r.reason.includes("exit 1"));
});

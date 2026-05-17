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
  extractPlatformUrl,
  parseQiitaItemId,
  buildQiitaUpdateRequest,
  parseTagsField,
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

test("parseTagsField: JSON array 形式の frontmatter tags を正しく扱う (実 article 形式)", () => {
  assert.deepEqual(
    parseTagsField('["WebP", "PNG", "画像変換", "ブログ", "Canva"]'),
    ["WebP", "PNG", "画像変換", "ブログ", "Canva"],
  );
});

test("parseTagsField: 配列がそのまま渡されてもよい", () => {
  assert.deepEqual(parseTagsField(["a", "b"]), ["a", "b"]);
});

test("parseTagsField: コンマ区切り (クォートなし) もサポート", () => {
  assert.deepEqual(parseTagsField("a, b , c"), ["a", "b", "c"]);
});

test("parseTagsField: 各エントリの外側引用符を剥がす (二重引用符が残らない)", () => {
  assert.deepEqual(parseTagsField('"a", "b"'), ["a", "b"]);
});

test("parseTagsField: 不正値は空配列", () => {
  assert.deepEqual(parseTagsField(null), []);
  assert.deepEqual(parseTagsField(undefined), []);
  assert.deepEqual(parseTagsField(123), []);
});

test("parseTagsField: JSON-like だが parse 失敗 (クォートなし) は bracket を剥がしてから split", () => {
  // `[a, b, c]` is not valid JSON but is a common YAML flow-style shape.
  // Make sure brackets don't leak into the first/last tag (CodeRabbit #3254053625).
  assert.deepEqual(parseTagsField("[a, b, c]"), ["a", "b", "c"]);
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

/* --update mode (Issue #330 AC-3) */

test("parseArgs: --update flag が拾われる", () => {
  const r = parseArgs(["--article", "x.md", "--update"]);
  assert.equal(r.update, true);
});

test("parseArgs: --update なし → false", () => {
  const r = parseArgs(["--article", "x.md"]);
  assert.equal(r.update, false);
});

test("extractPlatformUrl: platforms.qiita を抽出", () => {
  const md = `---\ntitle: T\nplatforms:\n  qiita: "https://qiita.com/quickconv/items/ea94f0e954621a91bf2c"\n  note: "https://note.com/quickconv/n/x"\n---\nbody`;
  assert.equal(
    extractPlatformUrl(md, "qiita"),
    "https://qiita.com/quickconv/items/ea94f0e954621a91bf2c",
  );
  assert.equal(extractPlatformUrl(md, "note"), "https://note.com/quickconv/n/x");
});

test("extractPlatformUrl: クォートなしの値も受け付ける", () => {
  const md = `---\nplatforms:\n  qiita: https://qiita.com/u/items/abc\n---\nbody`;
  assert.equal(extractPlatformUrl(md, "qiita"), "https://qiita.com/u/items/abc");
});

test("extractPlatformUrl: 値が空文字なら null", () => {
  const md = `---\nplatforms:\n  qiita: ""\n---\nbody`;
  assert.equal(extractPlatformUrl(md, "qiita"), null);
});

test("extractPlatformUrl: 指定 key 不在なら null", () => {
  const md = `---\nplatforms:\n  qiita: "x"\n---\nbody`;
  assert.equal(extractPlatformUrl(md, "medium"), null);
});

test("extractPlatformUrl: frontmatter 不在なら null (素の string も安全)", () => {
  assert.equal(extractPlatformUrl("no frontmatter here", "qiita"), null);
  assert.equal(extractPlatformUrl(null, "qiita"), null);
});

test("extractPlatformUrl: platforms: ブロック外の同名キーは拾わない (security: 誤更新先防止)", () => {
  const md = [
    "---",
    "title: T",
    "qiita: https://attacker.example.com/items/abc",
    "platforms:",
    '  qiita: "https://qiita.com/quickconv/items/realone"',
    "---",
    "body",
  ].join("\n");
  assert.equal(
    extractPlatformUrl(md, "qiita"),
    "https://qiita.com/quickconv/items/realone",
    "platforms: ブロック配下の値のみを返すべき",
  );
});

test("extractPlatformUrl: platforms: ブロック自体が無ければ null (top-level キーは無視)", () => {
  const md = `---\ntitle: T\nqiita: https://qiita.com/u/items/abc\n---\nbody`;
  assert.equal(extractPlatformUrl(md, "qiita"), null);
});

test("parseQiitaItemId: 正規 URL から item_id 抽出", () => {
  assert.equal(
    parseQiitaItemId("https://qiita.com/quickconv/items/ea94f0e954621a91bf2c"),
    "ea94f0e954621a91bf2c",
  );
});

test("parseQiitaItemId: trailing slash / query string も許容", () => {
  assert.equal(parseQiitaItemId("https://qiita.com/u/items/abc123/"), "abc123");
  assert.equal(parseQiitaItemId("https://qiita.com/u/items/abc123?x=1"), "abc123");
});

test("parseQiitaItemId: 形式不一致なら null", () => {
  assert.equal(parseQiitaItemId("https://example.com/x"), null);
  assert.equal(parseQiitaItemId(""), null);
  assert.equal(parseQiitaItemId(null), null);
});

test("buildQiitaUpdateRequest: ok=true で PATCH リクエスト構築", () => {
  const r = buildQiitaUpdateRequest({
    article: "004-webp-to-png.md",
    body: "body content",
    meta: { title: "T", tags: "a, b" },
    qiitaUrl: "https://qiita.com/quickconv/items/abc1234567890def",
  });
  assert.equal(r.ok, true);
  assert.equal(r.method, "PATCH");
  assert.equal(r.item_id, "abc1234567890def");
  assert.ok(r.url.endsWith("/abc1234567890def"));
  assert.equal(r.body.title, "T");
  assert.equal(r.body.body, "body content");
  assert.deepEqual(r.body.tags, [
    { name: "a", versions: [] },
    { name: "b", versions: [] },
  ]);
  // private はあえて送らない (既存の公開状態を温存)
  assert.equal(r.body.private, undefined, "update payload は visibility を変えない");
});

test("buildQiitaUpdateRequest: qiitaUrl 空なら ok=false", () => {
  const r = buildQiitaUpdateRequest({
    article: "x.md",
    body: "b",
    meta: {},
    qiitaUrl: null,
  });
  assert.equal(r.ok, false);
  assert.ok(r.reason.includes("no Qiita URL"));
});

test("buildQiitaUpdateRequest: 不正な qiitaUrl なら ok=false + reason", () => {
  const r = buildQiitaUpdateRequest({
    article: "x.md",
    body: "b",
    meta: {},
    qiitaUrl: "https://example.com/not-qiita",
  });
  assert.equal(r.ok, false);
  assert.ok(r.reason.includes("unparseable Qiita URL"));
});

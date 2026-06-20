import { describe, it, expect } from "vitest";
import {
  ARTICLE_GUIDES,
  getArticleGuideMeta,
  loadArticleGuide,
} from "@/lib/article-guides";
import { GUIDE_SLUGS } from "@/lib/guide";

describe("article guides registry (Issue #370)", () => {
  it("publishes exactly the two on-topic JA conversion guides", () => {
    expect(ARTICLE_GUIDES).toHaveLength(2);
    const slugs = ARTICLE_GUIDES.map((a) => a.slug).sort();
    expect(slugs).toEqual(["mp4-to-mp3", "webp-to-png"]);
    for (const a of ARTICLE_GUIDES) {
      expect(a.locale).toBe("ja");
    }
  });

  it("maps each guide to a real conversion-tool CTA", () => {
    expect(getArticleGuideMeta("webp-to-png")?.ctaHref).toBe(
      "/convert/webp-to-png",
    );
    expect(getArticleGuideMeta("mp4-to-mp3")?.ctaHref).toBe(
      "/convert/mp4-to-mp3",
    );
  });

  it("returns undefined for an unknown slug", () => {
    expect(getArticleGuideMeta("does-not-exist")).toBeUndefined();
  });

  it("never collides with an existing i18n guide slug", () => {
    // Both feed the same /guide/[slug] route; the route resolves article
    // guides first, so a collision would permanently shadow the i18n guide.
    const i18n = new Set<string>(GUIDE_SLUGS);
    const collisions = ARTICLE_GUIDES.filter((a) => i18n.has(a.slug));
    expect(collisions).toEqual([]);
  });
});

describe("loadArticleGuide (markdown rendering)", () => {
  it("loads frontmatter and renders the WebP→PNG article", () => {
    const guide = loadArticleGuide("webp-to-png");
    expect(guide.locale).toBe("ja");
    expect(guide.title).toBe("WebPをPNGに変換する最も簡単な方法【2026年版】");
    expect(guide.description.length).toBeGreaterThan(0);
    expect(guide.publishedAt).toBe("2026-05-01");
    // GFM tables render.
    expect(guide.html).toContain("<table");
    // Headings render (the body uses ##/###, never a second H1).
    expect(guide.html).toContain("<h2");
    expect(guide.html).not.toContain("<h1");
  });

  it("rewrites article-local image paths to the public asset path", () => {
    const guide = loadArticleGuide("webp-to-png");
    expect(guide.html).toContain(
      "/guide-assets/webp-to-png/header-webp-to-png.png",
    );
    // No raw markdown-relative image paths leak into the rendered HTML.
    expect(guide.html).not.toContain("./images/");
  });

  it("de-links cross-article references that have no on-site target", () => {
    const guide = loadArticleGuide("webp-to-png");
    // The `/articles/...` and `*.md` links must not survive as anchors.
    expect(guide.html).not.toContain('href="/articles/');
    expect(guide.html).not.toContain(".md\"");
    // ...but the link text is preserved as plain content.
    expect(guide.html).toContain("WebP vs AVIF vs HEIC");
  });

  it("renders the MP4→MP3 article with its own assets", () => {
    const guide = loadArticleGuide("mp4-to-mp3");
    expect(guide.locale).toBe("ja");
    expect(guide.title).toContain("MP4→MP3");
    expect(guide.publishedAt).toBe("2026-05-01");
    expect(guide.html).toContain(
      "/guide-assets/mp4-to-mp3/header-mp4-to-mp3.png",
    );
    expect(guide.html).not.toContain("./images/");
    expect(guide.html).toContain("<table");
  });

  it("throws for an unknown slug", () => {
    expect(() => loadArticleGuide("nope")).toThrow();
  });
});

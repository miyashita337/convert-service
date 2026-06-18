import { existsSync, readFileSync } from "fs";
import path from "path";
import { marked } from "marked";
import type { Locale } from "./i18n/config";

/**
 * Markdown-driven guide articles.
 *
 * The existing `/guide/<slug>` route renders bilingual content from i18n
 * namespaces (see GUIDE_SLUGS in `./guide`). These article guides are a second,
 * single-language content path: each entry publishes one existing markdown
 * article from `docs/articles/` at `/<locale>/guide/<slug>` for its own locale
 * only. The markdown file stays the single source of truth (no content is
 * duplicated into i18n messages).
 *
 * Articles are only added here when they (a) are an on-topic file-conversion
 * guide, (b) do not duplicate an existing i18n guide topic, and (c) can link to
 * a real conversion tool. See Issue #370 for the per-article triage.
 *
 * Security note: the rendered markdown is injected via dangerouslySetInnerHTML
 * (see renderArticle). This is safe only because the source is first-party
 * markdown committed to this repo. These articles are also syndicated to
 * external platforms (note/Qiita/Hashnode); if a future workflow ever syncs
 * content back from those platforms into docs/articles/, that breaks the trust
 * boundary and must go through a security review before merging.
 */
export interface ArticleGuide {
  /** URL slug under `/guide/`. Chosen to match the conversion query intent. */
  slug: string;
  /** The only locale this article is published for (no machine translation). */
  locale: Locale;
  /** Markdown file name under `docs/articles/`. */
  sourceFile: string;
  /** Directory under `docs/articles/images/` holding the article's images. */
  imageSrcDir: string;
  /** Locale-aware conversion-tool path used for the in-article CTA. */
  ctaHref: string;
}

export const ARTICLE_GUIDES: readonly ArticleGuide[] = [
  {
    slug: "webp-to-png",
    locale: "ja",
    sourceFile: "004-webp-to-png.md",
    imageSrcDir: "004-webp-to-png",
    ctaHref: "/convert/webp-to-png",
  },
  {
    slug: "mp4-to-mp3",
    locale: "ja",
    sourceFile: "005-mp4-to-mp3.md",
    imageSrcDir: "005-mp4-to-mp3",
    ctaHref: "/convert/mp4-to-mp3",
  },
] as const;

export interface LoadedArticleGuide extends ArticleGuide {
  title: string;
  description: string;
  publishedAt: string;
  /** Rendered HTML body (first-party trusted content; see renderArticle). */
  html: string;
}

export function getArticleGuideMeta(slug: string): ArticleGuide | undefined {
  return ARTICLE_GUIDES.find((a) => a.slug === slug);
}

/**
 * Locate `docs/articles/` by walking up from the current working directory.
 * cwd is `apps/web` during build / dev / vitest, so the repo root is one level
 * up, but the search keeps this robust to where the process is launched from.
 */
function resolveArticlesDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "docs", "articles");
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(process.cwd(), "../../docs/articles");
}

/**
 * Reads a single double-quoted frontmatter scalar. The article frontmatter
 * convention (docs/articles/README.md) always double-quotes title/description/
 * published_at, so unquoted or single-quoted values are intentionally not
 * supported and return "".
 */
function readFrontmatterField(frontmatter: string, key: string): string {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*"([^"]*)"\\s*$`, "m"));
  return match ? match[1] : "";
}

/**
 * Render an article's markdown body to HTML.
 *
 * Trust boundary: input is a first-party markdown file committed to this repo
 * (`docs/articles/`), never user-supplied content. The output is injected via
 * dangerouslySetInnerHTML in the guide page. No untrusted input ever reaches
 * this function, so marked's raw-HTML passthrough is safe here.
 */
function renderArticle(body: string, guide: ArticleGuide): string {
  // 1. Rewrite article-local image paths to the public asset path.
  //    `./images/004-webp-to-png/foo.png` -> `/guide-assets/webp-to-png/foo.png`
  const withAssets = body.replaceAll(
    `./images/${guide.imageSrcDir}/`,
    `/guide-assets/${guide.slug}/`,
  );

  // 2. Drop links that point at non-existent on-site targets (cross-article
  //    references like `./001-tech-stack.md` or `/articles/...`), keeping the
  //    link text. The negative lookbehind leaves image syntax (`![..](..)`)
  //    untouched; image paths were already rewritten in step 1.
  const deLinked = withAssets.replace(
    /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g,
    (full, text: string, url: string) => {
      const broken =
        url.startsWith(".") || /\.md(#|$)/.test(url) || url.startsWith("/articles/");
      return broken ? text : full;
    },
  );

  return marked.parse(deLinked, { async: false, gfm: true }) as string;
}

export function loadArticleGuide(slug: string): LoadedArticleGuide {
  const guide = getArticleGuideMeta(slug);
  if (!guide) {
    throw new Error(`Unknown article guide slug: ${slug}`);
  }

  const filePath = path.join(resolveArticlesDir(), guide.sourceFile);
  const raw = readFileSync(filePath, "utf-8");

  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const frontmatter = fmMatch ? fmMatch[1] : "";
  let body = fmMatch ? raw.slice(fmMatch[0].length) : raw;

  // The page renders the frontmatter title as the <h1>; strip a leading
  // top-level markdown heading from the body if one exists to avoid two H1s.
  body = body.replace(/^\s*#\s+.*\n/, "");

  return {
    ...guide,
    title: readFrontmatterField(frontmatter, "title"),
    description: readFrontmatterField(frontmatter, "description"),
    publishedAt: readFrontmatterField(frontmatter, "published_at"),
    html: renderArticle(body, guide),
  };
}

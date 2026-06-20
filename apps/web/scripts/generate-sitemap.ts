import { writeFileSync } from "fs";
import { resolve } from "path";
import { CONVERSION_PAIRS } from "@quickconv/shared";
import { GUIDE_SLUGS } from "../src/lib/guide";
import { ARTICLE_GUIDES } from "../src/lib/article-guides";

const BASE_URL = "https://quickconv.cc";
const LOCALES = ["en", "ja"] as const;
type SitemapLocale = (typeof LOCALES)[number];
const OUTPUT_PATH = resolve(__dirname, "../out/sitemap.xml");

interface SitemapEntry {
  path: string;
}

function getStaticPages(): SitemapEntry[] {
  return [{ path: "" }, { path: "/privacy" }, { path: "/terms" }, { path: "/guide" }];
}

function getGuidePages(): SitemapEntry[] {
  return GUIDE_SLUGS.map((slug) => ({ path: `/guide/${slug}` }));
}

function getConversionPages(): SitemapEntry[] {
  const pages: SitemapEntry[] = [];
  for (const [from, targets] of Object.entries(CONVERSION_PAIRS)) {
    for (const to of targets) {
      pages.push({ path: `/convert/${from}-to-${to}` });
    }
  }
  return pages;
}

function buildHreflangLinks(path: string, hreflangLocales: readonly SitemapLocale[]): string {
  return hreflangLocales
    .map(
      (locale) =>
        `      <xhtml:link rel="alternate" hreflang="${locale}" href="${BASE_URL}/${locale}${path}" />`,
    )
    .join("\n");
}

function buildUrlEntry(
  locale: SitemapLocale,
  path: string,
  hreflangLocales: readonly SitemapLocale[],
): string {
  return `  <url>
    <loc>${BASE_URL}/${locale}${path}</loc>
${buildHreflangLinks(path, hreflangLocales)}
    <changefreq>weekly</changefreq>
  </url>`;
}

function generateSitemap(): string {
  const bilingualPages = [
    ...getStaticPages(),
    ...getGuidePages(),
    ...getConversionPages(),
  ];

  const urls: string[] = [];

  // Pages available in every locale, cross-linked via hreflang.
  for (const page of bilingualPages) {
    for (const locale of LOCALES) {
      urls.push(buildUrlEntry(locale, page.path, LOCALES));
    }
  }

  // Single-language markdown guides: one entry, self-referencing hreflang only.
  for (const article of ARTICLE_GUIDES) {
    urls.push(
      buildUrlEntry(article.locale, `/guide/${article.slug}`, [article.locale]),
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${urls.join("\n")}
</urlset>
`;
}

function main(): void {
  const sitemap = generateSitemap();
  writeFileSync(OUTPUT_PATH, sitemap, "utf-8");
  const urlCount = (sitemap.match(/<url>/g) || []).length;
  console.log(`Sitemap generated: ${OUTPUT_PATH} (${urlCount} URLs)`);
}

main();

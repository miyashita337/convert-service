import { writeFileSync } from "fs";
import { resolve } from "path";
import { CONVERSION_PAIRS } from "@quickconv/shared";

const BASE_URL = "https://quickconv.cc";
const LOCALES = ["en", "ja"] as const;
const OUTPUT_PATH = resolve(__dirname, "../out/sitemap.xml");

interface SitemapEntry {
  path: string;
}

const GUIDE_SLUGS = [
  "what-is-avif",
  "heic-to-jpg-guide",
  "webp-vs-avif-vs-heic",
];

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

function buildHreflangLinks(path: string): string {
  return LOCALES.map(
    (locale) =>
      `      <xhtml:link rel="alternate" hreflang="${locale}" href="${BASE_URL}/${locale}${path}" />`
  ).join("\n");
}

function buildUrlEntry(locale: string, path: string): string {
  return `  <url>
    <loc>${BASE_URL}/${locale}${path}</loc>
${buildHreflangLinks(path)}
    <changefreq>weekly</changefreq>
  </url>`;
}

function generateSitemap(): string {
  const pages = [...getStaticPages(), ...getGuidePages(), ...getConversionPages()];

  const urls = pages.flatMap((page) =>
    LOCALES.map((locale) => buildUrlEntry(locale, page.path))
  );

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

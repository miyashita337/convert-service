import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { GUIDE_SLUGS } from "@/lib/guide";
import { locales, type Locale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildPageMetadata({
    title: t("guideListTitle"),
    description: t("guideListDescription"),
    locale: locale as Locale,
    path: "/guide",
  });
}

const GUIDE_NAMESPACE_MAP: Record<string, string> = {
  "what-is-avif": "guideWhatIsAvif",
  "heic-to-jpg-guide": "guideHeicToJpg",
  "webp-vs-avif-vs-heic": "guideWebpVsAvifVsHeic",
  "heic-complete-guide": "guideHeicComplete",
  "blog-image-optimization": "guideBlogImageOpt",
  "png-to-jpg": "guidePngToJpg",
  "pdf-to-jpg": "guidePdfToJpg",
  "mp4-to-gif": "guideMp4ToGif",
};

export default async function GuideListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guideList");
  const tCommon = await getTranslations("common");

  const articles = await Promise.all(
    GUIDE_SLUGS.map(async (slug) => {
      const ns = GUIDE_NAMESPACE_MAP[slug];
      const tArticle = await getTranslations(ns);
      return {
        slug,
        title: tArticle("title"),
        description: tArticle("description"),
        publishedAt: tArticle("publishedAt"),
      };
    }),
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <BreadcrumbJsonLd
        locale={locale as Locale}
        items={[{ name: tCommon("guide") }]}
      />
      <Breadcrumb items={[{ label: tCommon("guide") }]} />

      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>

      <div className="mt-8 space-y-6">
        {articles.map((article) => (
          <article
            key={article.slug}
            className="border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
          >
            <Link href={`/guide/${article.slug}`} className="block group">
              <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                {article.title}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {article.description}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <time className="text-sm text-muted-foreground">
                  {article.publishedAt}
                </time>
                <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
                  {tCommon("readMore")}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

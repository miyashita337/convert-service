import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConversionCard } from "@/components/conversion-card";
import { Breadcrumb } from "@/components/breadcrumb";
import { RelatedConversions } from "@/components/related-conversions";
import { CONVERSION_PAIRS, getRelatedConversions } from "@quickconv/shared";
import { locales, type Locale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

const VALID_SLUGS = Object.entries(CONVERSION_PAIRS).flatMap(([from, tos]) =>
  tos.map((to) => `${from}-to-${to}`),
);

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  return locales.flatMap((locale) =>
    VALID_SLUGS.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  const [from, , to] = slug.split("-");

  return buildPageMetadata({
    title: t("titleTemplate", { from: from.toUpperCase(), to: to.toUpperCase() }),
    description: t("descriptionTemplate", { from: from.toUpperCase(), to: to.toUpperCase() }),
    locale: locale as Locale,
    path: `/convert/${slug}`,
  });
}

export default async function ConvertPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  if (!VALID_SLUGS.includes(slug)) {
    notFound();
  }

  const [from, , to] = slug.split("-");
  const t = await getTranslations("seo");
  const tCommon = await getTranslations("common");
  const relatedConversions = getRelatedConversions(slug);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <Breadcrumb
        items={[
          { label: tCommon("imageConversion") },
          { label: `${from.toUpperCase()} to ${to.toUpperCase()}` },
        ]}
      />
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight">
          {from.toUpperCase()} &rarr; {to.toUpperCase()}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {t("descriptionTemplate", {
            from: from.toUpperCase(),
            to: to.toUpperCase(),
          })}
        </p>
      </div>
      <ConversionCard />
      <RelatedConversions conversions={relatedConversions} />
    </div>
  );
}

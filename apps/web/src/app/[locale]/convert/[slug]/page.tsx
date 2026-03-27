import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConversionCard } from "@/components/conversion-card";
import { Breadcrumb } from "@/components/breadcrumb";
import { HowToJsonLd, BreadcrumbJsonLd, FAQJsonLd } from "@/components/json-ld";
import { RelatedConversions } from "@/components/related-conversions";
import { ConvertPageContent } from "@/components/convert-page-content";
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
    title: t("titleTemplate", {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
    }),
    description: t("descriptionTemplate", {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
    }),
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
  const tJsonLd = await getTranslations("jsonLd");
  const tConvert = await getTranslations("convertPages");
  const relatedConversions = getRelatedConversions(slug);
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  const pageKey = `pages.${slug}`;
  const faqItems: { question: string; answer: string }[] = [];
  for (let i = 1; i <= 8; i++) {
    const qKey = tConvert.has(`${pageKey}.faq${i}Question`)
      ? `${pageKey}.faq${i}Question`
      : i <= 5 ? `faq${i}Question` : null;
    if (!qKey) break;
    const aKey = tConvert.has(`${pageKey}.faq${i}Answer`)
      ? `${pageKey}.faq${i}Answer`
      : `faq${i}Answer`;
    faqItems.push({
      question: tConvert(qKey, { from: fromUpper, to: toUpper }),
      answer: tConvert(aKey, { from: fromUpper, to: toUpper }),
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <HowToJsonLd
        locale={locale as Locale}
        from={fromUpper}
        to={toUpper}
        name={tJsonLd("howToName", { from: fromUpper, to: toUpper })}
        description={tJsonLd("howToDescription", {
          from: fromUpper,
          to: toUpper,
        })}
        steps={[
          {
            name: tJsonLd("stepUploadName"),
            text: tJsonLd("stepUploadText", { from: fromUpper }),
          },
          {
            name: tJsonLd("stepConvertName"),
            text: tJsonLd("stepConvertText", { to: toUpper }),
          },
          {
            name: tJsonLd("stepDownloadName"),
            text: tJsonLd("stepDownloadText", { to: toUpper }),
          },
        ]}
      />
      <BreadcrumbJsonLd
        locale={locale as Locale}
        items={[
          { name: tCommon("imageConversion") },
          { name: `${fromUpper} to ${toUpper}` },
        ]}
      />
      <Breadcrumb
        items={[
          { label: tCommon("imageConversion") },
          { label: `${fromUpper} to ${toUpper}` },
        ]}
      />
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight">
          {fromUpper} &rarr; {toUpper}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {t("descriptionTemplate", {
            from: fromUpper,
            to: toUpper,
          })}
        </p>
      </div>
      <ConversionCard />
      <ConvertPageContent from={from} to={to} />
      <RelatedConversions conversions={relatedConversions} />
      <FAQJsonLd faqItems={faqItems} />
    </div>
  );
}

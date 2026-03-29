import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConversionCard } from "@/components/conversion-card";
import { PopularConversions } from "@/components/popular-conversions";
import { CategoryConversions } from "@/components/category-conversions";
import { ConversionCounter } from "@/components/conversion-counter";
import { HeroHeadline } from "@/components/hero-headline";
import { WebApplicationJsonLd } from "@/components/json-ld";
import { buildPageMetadata } from "@/lib/metadata";
import { locales, type Locale } from "@/lib/i18n/config";
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
    title: t("homeTitle"),
    description: t("homeDescription"),
    locale: locale as Locale,
    path: "/",
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");
  const tJsonLd = await getTranslations("jsonLd");

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <WebApplicationJsonLd
        locale={locale as Locale}
        name={tJsonLd("webAppName")}
        description={tJsonLd("webAppDescription")}
      />
      <div className="text-center mb-10">
        <HeroHeadline />
        <p className="mt-3 text-lg text-muted-foreground">
          {t("description")}
        </p>
        <ConversionCounter />
      </div>
      <ConversionCard />
      <PopularConversions />
      <CategoryConversions />
    </div>
  );
}

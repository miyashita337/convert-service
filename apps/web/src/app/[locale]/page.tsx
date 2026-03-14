import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConversionCard } from "@/components/conversion-card";
import { PopularConversions } from "@/components/popular-conversions";
import { AdSlot } from "@/components/ad-slot";
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
        <h1 className="text-4xl font-bold tracking-tight">{t("tagline")}</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {/* Ad: leaderboard below tagline */}
      <AdSlot slot="SLOT_LEADERBOARD" placement="leaderboard" className="mb-8" />

      <ConversionCard />

      {/* Ad: rectangle between converter and popular conversions */}
      <AdSlot slot="SLOT_RECTANGLE" placement="rectangle" className="my-8" />

      <PopularConversions />
    </div>
  );
}

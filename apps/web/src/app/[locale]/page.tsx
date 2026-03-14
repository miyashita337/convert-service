import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConversionCard } from "@/components/conversion-card";
import { PopularConversions } from "@/components/popular-conversions";
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight">{t("tagline")}</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <ConversionCard />
      <PopularConversions />
    </div>
  );
}

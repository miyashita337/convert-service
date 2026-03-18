import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/breadcrumb";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { locales, type Locale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import { PricingPlans } from "@/components/pricing-plans";
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
    title: t("pricingTitle"),
    description: t("pricingDescription"),
    locale: locale as Locale,
    path: "/pricing",
  });
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <BreadcrumbJsonLd
        locale={locale as Locale}
        items={[{ name: t("title") }]}
      />
      <Breadcrumb items={[{ label: t("title") }]} />

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("description")}</p>
      </div>

      <PricingPlans />

      {/* FAQ */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">{t("faqTitle")}</h2>
        <div className="max-w-3xl mx-auto space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-border rounded-lg p-5">
              <h3 className="font-semibold">{t(`faq${i}Question`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(`faq${i}Answer`)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

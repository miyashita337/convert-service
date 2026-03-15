import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/breadcrumb";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { locales, type Locale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import { Check } from "lucide-react";
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

interface PlanProps {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
  disabled?: boolean;
}

function PlanCard({ name, price, period, features, cta, highlighted, badge, disabled }: PlanProps) {
  return (
    <div
      className={`rounded-xl border p-6 flex flex-col ${
        highlighted
          ? "border-primary shadow-lg ring-1 ring-primary"
          : "border-border"
      }`}
    >
      {badge && (
        <span className="inline-flex self-start mb-3 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
          {badge}
        </span>
      )}
      <h3 className="text-lg font-semibold">{name}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{price}</span>
        {period && <span className="text-sm text-muted-foreground">/{period}</span>}
      </div>
      <ul className="mt-6 space-y-3 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button
        disabled={disabled}
        className={`mt-8 w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
          highlighted
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : disabled
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
      >
        {cta}
      </button>
    </div>
  );
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Free */}
        <PlanCard
          name={t("freeName")}
          price={t("freePrice")}
          period=""
          features={[
            t("freeFeature1"),
            t("freeFeature2"),
            t("freeFeature3"),
            t("freeFeature4"),
          ]}
          cta={t("freeCta")}
          disabled
        />

        {/* 7-Day Pass */}
        <PlanCard
          name={t("passName")}
          price={t("passPrice")}
          period={t("passPeriod")}
          features={[
            t("passFeature1"),
            t("passFeature2"),
            t("passFeature3"),
          ]}
          cta={t("passCta")}
          disabled
        />

        {/* Plus */}
        <PlanCard
          name={t("plusName")}
          price={t("plusPrice")}
          period={t("plusPeriod")}
          features={[
            t("plusFeature1"),
            t("plusFeature2"),
            t("plusFeature3"),
            t("plusFeature4"),
          ]}
          cta={t("plusCta")}
          highlighted
          badge={t("recommended")}
          disabled
        />

        {/* Pro */}
        <PlanCard
          name={t("proName")}
          price={t("proPrice")}
          period={t("proPeriod")}
          features={[
            t("proFeature1"),
            t("proFeature2"),
            t("proFeature3"),
            t("proFeature4"),
            t("proFeature5"),
          ]}
          cta={t("proCta")}
          disabled
        />
      </div>

      {/* FAQ */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">{t("faqTitle")}</h2>
        <div className="max-w-3xl mx-auto space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-border rounded-lg p-5">
              <h3 className="font-semibold">{t(`faq${i}Question`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(`faq${i}Answer`)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

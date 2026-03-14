import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/breadcrumb";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { locales, type Locale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import { Mail } from "lucide-react";
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
    title: t("contactTitle"),
    description: t("contactDescription"),
    locale: locale as Locale,
    path: "/contact",
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <BreadcrumbJsonLd
        locale={locale as Locale}
        items={[{ name: t("title") }]}
      />
      <Breadcrumb items={[{ label: t("title") }]} />
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-4 text-muted-foreground">{t("intro")}</p>

      <section className="mt-8 rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t("emailTitle")}</h2>
        </div>
        <p className="text-muted-foreground">{t("emailDescription")}</p>
        <a
          href="mailto:quickconv.cc@gmail.com"
          className="mt-3 inline-flex items-center gap-2 text-primary hover:underline font-medium"
        >
          quickconv.cc@gmail.com
        </a>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("responseTimeTitle")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("responseTimeDescription")}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("topicsTitle")}</h2>
        <ul className="mt-2 list-disc list-inside text-muted-foreground space-y-1">
          <li>{t("topicBug")}</li>
          <li>{t("topicFeature")}</li>
          <li>{t("topicPrivacy")}</li>
          <li>{t("topicOther")}</li>
        </ul>
      </section>
    </div>
  );
}

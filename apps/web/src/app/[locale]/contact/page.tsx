import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/breadcrumb";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { locales, type Locale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
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
      <p className="mt-6 text-muted-foreground">{t("intro")}</p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("emailTitle")}</h2>
        <p className="mt-2 text-muted-foreground">{t("emailDescription")}</p>
        <p className="mt-2">
          <a
            href="mailto:support@quickconv.cc"
            className="text-primary hover:underline font-medium"
          >
            support@quickconv.cc
          </a>
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("responseTitle")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("responseDescription")}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("operatorTitle")}</h2>
        <p className="mt-2 text-muted-foreground">{t("operatorName")}</p>
        <p className="mt-1 text-muted-foreground">{t("operatorService")}</p>
      </section>
    </div>
  );
}

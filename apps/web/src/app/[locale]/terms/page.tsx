import { getTranslations, setRequestLocale } from "next-intl/server";
import { locales } from "@/lib/i18n/config";
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
  const t = await getTranslations({ locale, namespace: "termsOfService" });
  return {
    title: `${t("title")} | QuickConv`,
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("termsOfService");

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("lastUpdated")}</p>
      <p className="mt-6 text-muted-foreground">{t("intro")}</p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("serviceTitle")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("serviceDescription")}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("usageTitle")}</h2>
        <p className="mt-2 text-muted-foreground">{t("usageDescription")}</p>
        <ul className="mt-2 list-disc list-inside text-muted-foreground space-y-1">
          <li>{t("usageLegal")}</li>
          <li>{t("usageNoMalicious")}</li>
          <li>{t("usageNoAbuse")}</li>
          <li>{t("usageComply")}</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("filesTitle")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("filesDescription")}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("disclaimerTitle")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("disclaimerDescription")}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("limitationTitle")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("limitationDescription")}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("changesTitle")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("changesDescription")}
        </p>
      </section>
    </div>
  );
}

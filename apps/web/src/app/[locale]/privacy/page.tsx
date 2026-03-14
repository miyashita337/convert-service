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
  const t = await getTranslations({ locale, namespace: "privacyPolicy" });
  return {
    title: `${t("title")} | QuickConv`,
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacyPolicy");

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("lastUpdated")}</p>
      <p className="mt-6 text-muted-foreground">{t("intro")}</p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("dataCollectionTitle")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("dataCollectionDescription")}
        </p>
        <ul className="mt-2 list-disc list-inside text-muted-foreground space-y-1">
          <li>{t("dataIpHash")}</li>
          <li>{t("dataCookieId")}</li>
          <li>{t("dataUserAgent")}</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("purposeTitle")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("purposeDescription")}
        </p>
        <ul className="mt-2 list-disc list-inside text-muted-foreground space-y-1">
          <li>{t("purposeRateLimit")}</li>
          <li>{t("purposeServiceImprovement")}</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("retentionTitle")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("retentionDescription")}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("thirdPartyTitle")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("thirdPartyDescription")}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("cookiesTitle")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("cookiesDescription")}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">{t("rightsTitle")}</h2>
        <p className="mt-2 text-muted-foreground">
          {t("rightsDescription")}
        </p>
        <ul className="mt-2 list-disc list-inside text-muted-foreground space-y-1">
          <li>{t("rightsAccess")}</li>
          <li>{t("rightsDelete")}</li>
          <li>{t("rightsRestrict")}</li>
        </ul>
        <p className="mt-2 text-muted-foreground">{t("rightsContact")}</p>
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

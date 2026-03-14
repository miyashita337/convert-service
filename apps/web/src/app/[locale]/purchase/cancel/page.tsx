import { getTranslations, setRequestLocale } from "next-intl/server";
import { locales, type Locale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import { Link } from "@/lib/i18n/navigation";
import { XCircle } from "lucide-react";
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
  const t = await getTranslations({ locale, namespace: "purchase" });

  return buildPageMetadata({
    title: t("cancelTitle"),
    description: t("cancelDescription"),
    locale: locale as Locale,
    path: "/purchase/cancel",
  });
}

export default async function PurchaseCancelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("purchase");

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-6">
        <XCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold">{t("cancelHeading")}</h1>
      <p className="mt-4 text-muted-foreground">{t("cancelMessage")}</p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          {t("viewPlans")}
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
        >
          {t("backToHome")}
        </Link>
      </div>
    </div>
  );
}

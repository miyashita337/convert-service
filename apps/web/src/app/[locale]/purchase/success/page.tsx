import { getTranslations, setRequestLocale } from "next-intl/server";
import { locales, type Locale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import { Link } from "@/lib/i18n/navigation";
import { CheckCircle } from "lucide-react";
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
    title: t("successTitle"),
    description: t("successDescription"),
    locale: locale as Locale,
    path: "/purchase/success",
  });
}

export default async function PurchaseSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("purchase");

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <h1 className="text-2xl font-bold">{t("successHeading")}</h1>
      <p className="mt-4 text-muted-foreground">{t("successMessage")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
      >
        {t("startConverting")}
      </Link>
    </div>
  );
}

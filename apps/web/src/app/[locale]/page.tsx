import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConversionCard } from "@/components/conversion-card";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight">{t("tagline")}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{t("description")}</p>
      </div>
      <ConversionCard />
    </div>
  );
}

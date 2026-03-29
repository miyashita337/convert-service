import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { getAllConversionSlugs, type ConversionSlug } from "@quickconv/shared";
import { getConversionCategory } from "@quickconv/shared";

interface CategoryGroup {
  key: string;
  conversions: ConversionSlug[];
}

function groupByCategory(): CategoryGroup[] {
  const all = getAllConversionSlugs();
  const groups: Record<string, ConversionSlug[]> = {};

  for (const conv of all) {
    const cat = getConversionCategory(conv.from);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(conv);
  }

  // Order: image first, then audio, video, document
  const order = ["image", "audio", "video", "pdf"];
  return order
    .filter((key) => groups[key]?.length)
    .map((key) => ({ key, conversions: groups[key] }));
}

export async function CategoryConversions() {
  const t = await getTranslations("common");
  const categories = groupByCategory();

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold tracking-tight text-center">
        {t("allConversions")}
      </h2>
      <p className="mt-2 text-center text-muted-foreground">
        {t("allConversionsDescription")}
      </p>
      <div className="mt-8 space-y-10">
        {categories.map((group) => (
          <div key={group.key}>
            <h3 className="text-lg font-semibold mb-4">
              {t(`category_${group.key}`)}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.conversions.map((conv) => (
                <Link
                  key={conv.slug}
                  href={`/convert/${conv.slug}`}
                  className="group flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm hover:border-primary/50 hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium">
                    {conv.from.toUpperCase()} &rarr; {conv.to.toUpperCase()}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { ArrowRight } from "lucide-react";
import type { ConversionSlug } from "@quickconv/shared";

interface RelatedConversionsProps {
  conversions: ConversionSlug[];
}

export function RelatedConversions({ conversions }: RelatedConversionsProps) {
  const t = useTranslations("common");

  if (conversions.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold tracking-tight text-center">
        {t("relatedConversions")}
      </h2>
      <p className="mt-2 text-center text-muted-foreground">
        {t("relatedConversionsDescription")}
      </p>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {conversions.map((conv) => (
          <Link
            key={conv.slug}
            href={`/convert/${conv.slug}`}
            className="group flex items-center justify-between rounded-lg border border-border p-4 hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium">
              {conv.from.toUpperCase()} &rarr; {conv.to.toUpperCase()}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>
    </section>
  );
}

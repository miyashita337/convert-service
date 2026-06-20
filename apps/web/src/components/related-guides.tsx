import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { BookOpen } from "lucide-react";
import type { GuideSlug } from "@/lib/guide";

/**
 * Maps format names to related guide slugs.
 * A conversion page shows guides where either the source or target format is relevant.
 */
const FORMAT_TO_GUIDES: Record<string, GuideSlug[]> = {
  avif: ["what-is-avif", "webp-vs-avif-vs-heic"],
  heic: ["heic-to-jpg-guide", "heic-complete-guide", "webp-vs-avif-vs-heic"],
  webp: ["webp-vs-avif-vs-heic", "blog-image-optimization"],
  jpg: ["blog-image-optimization", "png-to-jpg", "pdf-to-jpg"],
  png: ["blog-image-optimization", "png-to-jpg"],
  pdf: ["pdf-to-jpg"],
  mp4: ["mp4-to-gif"],
  gif: ["mp4-to-gif"],
};

const GUIDE_TITLE_KEYS: Record<GuideSlug, string> = {
  "what-is-avif": "guideWhatIsAvifTitle",
  "heic-to-jpg-guide": "guideHeicToJpgTitle",
  "webp-vs-avif-vs-heic": "guideWebpVsAvifVsHeicTitle",
  "heic-complete-guide": "guideHeicCompleteTitle",
  "blog-image-optimization": "guideBlogImageOptTitle",
  "png-to-jpg": "guidePngToJpgTitle",
  "pdf-to-jpg": "guidePdfToJpgTitle",
  "mp4-to-gif": "guideMp4ToGifTitle",
};

export function getRelatedGuides(from: string, to: string): GuideSlug[] {
  const guides = new Set<GuideSlug>();
  for (const slug of FORMAT_TO_GUIDES[from.toLowerCase()] ?? []) {
    guides.add(slug);
  }
  for (const slug of FORMAT_TO_GUIDES[to.toLowerCase()] ?? []) {
    guides.add(slug);
  }
  return [...guides];
}

interface RelatedGuidesProps {
  from: string;
  to: string;
}

export async function RelatedGuides({ from, to }: RelatedGuidesProps) {
  const guides = getRelatedGuides(from, to);
  if (guides.length === 0) return null;

  const t = await getTranslations("common");
  const tSeo = await getTranslations("seo");

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold tracking-tight">
        {t("relatedGuides")}
      </h2>
      <div className="mt-4 space-y-3">
        {guides.map((slug) => (
          <Link
            key={slug}
            href={`/guide/${slug}`}
            className="group flex items-center gap-3 rounded-lg border border-border p-4 hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <BookOpen className="h-5 w-5 text-muted-foreground group-hover:text-primary shrink-0" />
            <span className="font-medium">{tSeo(GUIDE_TITLE_KEYS[slug])}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

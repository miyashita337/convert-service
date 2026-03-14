import { CONVERSION_PAIRS } from "../types/conversion";

export interface ConversionSlug {
  slug: string;
  from: string;
  to: string;
}

/**
 * Get all valid conversion slugs from CONVERSION_PAIRS.
 */
export function getAllConversionSlugs(): ConversionSlug[] {
  return Object.entries(CONVERSION_PAIRS).flatMap(([from, tos]) =>
    tos.map((to) => ({ slug: `${from}-to-${to}`, from, to })),
  );
}

/**
 * Get related conversions for a given slug.
 * Related = same source format OR same target format, excluding itself.
 * Returns up to `limit` results.
 */
export function getRelatedConversions(
  currentSlug: string,
  limit: number = 6,
): ConversionSlug[] {
  const parts = currentSlug.split("-to-");
  if (parts.length !== 2) return [];

  const [currentFrom, currentTo] = parts;
  const all = getAllConversionSlugs();

  const related = all.filter(
    (item) =>
      item.slug !== currentSlug &&
      (item.from === currentFrom || item.to === currentTo),
  );

  return related.slice(0, limit);
}

/**
 * Popular conversion pairs for the homepage.
 * Curated list of most commonly needed conversions.
 */
export const POPULAR_CONVERSIONS: ConversionSlug[] = [
  { slug: "heic-to-jpg", from: "heic", to: "jpg" },
  { slug: "heic-to-png", from: "heic", to: "png" },
  { slug: "png-to-webp", from: "png", to: "webp" },
  { slug: "webp-to-jpg", from: "webp", to: "jpg" },
  { slug: "avif-to-jpg", from: "avif", to: "jpg" },
  { slug: "jpg-to-webp", from: "jpg", to: "webp" },
  { slug: "png-to-jpg", from: "png", to: "jpg" },
  { slug: "svg-to-png", from: "svg", to: "png" },
  { slug: "gif-to-webp", from: "gif", to: "webp" },
];

export const GUIDE_SLUGS = [
  "what-is-avif",
  "heic-to-jpg-guide",
  "webp-vs-avif-vs-heic",
  "heic-complete-guide",
  "blog-image-optimization",
  "png-to-jpg",
  "pdf-to-jpg",
  "mp4-to-gif",
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

export function isValidGuideSlug(slug: string): slug is GuideSlug {
  return (GUIDE_SLUGS as readonly string[]).includes(slug);
}

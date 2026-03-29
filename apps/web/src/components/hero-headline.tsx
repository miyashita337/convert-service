import { getTranslations } from "next-intl/server";

const VARIANT_KEYS = [
  "taglineVariant1",
  "taglineVariant2",
  "taglineVariant3",
] as const;

export async function HeroHeadline() {
  const t = await getTranslations("common");

  // Pick a deterministic variant at build time for static export.
  // All three variants convey the same value proposition, so any is fine for LCP.
  const key = VARIANT_KEYS[0];

  return (
    <h1 className="text-4xl font-bold tracking-tight" data-variant={key}>
      {t(key)}
    </h1>
  );
}

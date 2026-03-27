"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

const VARIANT_KEYS = [
  "taglineVariant1",
  "taglineVariant2",
  "taglineVariant3",
] as const;

const STORAGE_KEY = "hero_variant";

export function HeroHeadline() {
  const t = useTranslations("common");
  const [variantIndex, setVariantIndex] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setVariantIndex(Number(stored));
    } else {
      const idx = Math.floor(Math.random() * VARIANT_KEYS.length);
      sessionStorage.setItem(STORAGE_KEY, String(idx));
      setVariantIndex(idx);
    }
  }, []);

  const key = VARIANT_KEYS[variantIndex];

  return (
    <h1 className="text-4xl font-bold tracking-tight" data-variant={key}>
      {t(key)}
    </h1>
  );
}

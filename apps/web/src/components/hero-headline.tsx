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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setVariantIndex(Number(stored));
    } else {
      const idx = Math.floor(Math.random() * VARIANT_KEYS.length);
      sessionStorage.setItem(STORAGE_KEY, String(idx));
      setVariantIndex(idx);
    }
    setMounted(true);
  }, []);

  // SSR and initial render: always show variant1 (no layout shift)
  const key = mounted ? VARIANT_KEYS[variantIndex] : VARIANT_KEYS[0];

  return (
    <h1 className="text-4xl font-bold tracking-tight" data-variant={key}>
      {t(key)}
    </h1>
  );
}

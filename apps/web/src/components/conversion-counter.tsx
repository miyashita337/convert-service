"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { fetchStats } from "@/lib/api-client";

export function ConversionCounter() {
  const t = useTranslations("common");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetchStats()
      .then((stats) => setCount(stats.totalConversions))
      .catch(() => {});
  }, []);

  if (count === null || count < 100) return null;

  const formatted = count.toLocaleString();

  return (
    <p className="text-sm text-muted-foreground">
      {t("conversionCount", { count: formatted })}
    </p>
  );
}

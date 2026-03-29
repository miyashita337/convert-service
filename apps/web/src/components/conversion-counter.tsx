"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export function ConversionCounter() {
  const t = useTranslations("common");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/stats`, {
      signal: controller.signal,
      credentials: "omit",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.totalConversions) setCount(data.totalConversions);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (count === null) return null;

  return (
    <p className="mt-4 text-sm text-muted-foreground">
      {t("conversionCount", { count: count.toLocaleString() })}
    </p>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Star, X } from "lucide-react";
import { useState } from "react";

interface UpgradeBannerProps {
  visible: boolean;
}

export function UpgradeBanner({ visible }: UpgradeBannerProps) {
  const t = useTranslations("upgrade");
  const [dismissed, setDismissed] = useState(false);

  if (!visible || dismissed) return null;

  return (
    <div className="relative rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-1">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded-sm p-1 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Close"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center justify-center gap-2">
        <Star className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">{t("bannerTitle")}</p>
      </div>
      <p className="text-xs text-muted-foreground">{t("bannerDescription")}</p>
    </div>
  );
}

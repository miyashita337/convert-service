"use client";

import { useTranslations, useLocale } from "next-intl";
import { Clock, Star, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCountdown } from "@/hooks/use-countdown";
import { PurchaseButton } from "./purchase-button";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  dailyLimit: number;
}

export function UpgradeModal({ open, onClose, dailyLimit }: UpgradeModalProps) {
  const t = useTranslations("upgrade");
  const { formatted } = useCountdown();
  const locale = useLocale();
  const currency = locale === "ja" ? "jpy" : "usd";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl">
            {t("modalTitle", { limit: dailyLimit })}
          </DialogTitle>
          <DialogDescription className="pt-1">
            {t("modalDescription")}
          </DialogDescription>
        </DialogHeader>

        {/* Countdown timer */}
        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted p-3 mt-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("resetsIn")}</span>
          <span className="font-mono text-lg font-bold tabular-nums">{formatted}</span>
        </div>

        {/* Pricing cards – Good-Better-Best */}
        <div className="grid gap-3 mt-4 sm:grid-cols-2">
          {/* 7-day pass */}
          <div className="relative rounded-xl border border-border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">{t("passTitle")}</h3>
            </div>
            <p className="text-2xl font-bold">
              {t("passPrice")}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                / {t("pass7days")}
              </span>
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>- {t("featureUnlimited")}</li>
              <li>- {t("featureNoAds")}</li>
            </ul>
            <PurchaseButton
              planId="pass_7d"
              currency={currency}
              label={t("comingSoon")}
            />
          </div>

          {/* Plus monthly */}
          <div className="relative rounded-xl border-2 border-primary p-4 space-y-2">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-primary-foreground uppercase">
              <Star className="h-3 w-3" />
              {t("recommended")}
            </span>
            <div className="flex items-center gap-2 pt-1">
              <Star className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">{t("plusTitle")}</h3>
            </div>
            <p className="text-2xl font-bold">
              {t("plusPrice")}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                / {t("perMonth")}
              </span>
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>- {t("featureUnlimited")}</li>
              <li>- {t("featureNoAds")}</li>
              <li>- {t("featurePriority")}</li>
            </ul>
            <PurchaseButton
              planId="plus_monthly"
              currency={currency}
              label={t("comingSoon")}
            />
          </div>
        </div>

        {/* Close / come back tomorrow */}
        <button
          onClick={onClose}
          className="w-full mt-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("comeBackTomorrow")}
        </button>
      </DialogContent>
    </Dialog>
  );
}

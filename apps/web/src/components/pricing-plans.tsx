"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { PurchaseButton } from "./purchase-button";

interface PlanConfig {
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyEquivalent: string;
  period: string;
  features: string[];
  monthlyPlanId: string;
  yearlyPlanId: string;
  highlighted?: boolean;
  badge?: string;
  savingsPercent?: string;
}

function PlanCard({
  name,
  price,
  period,
  features,
  planId,
  highlighted,
  badge,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  planId: string;
  highlighted?: boolean;
  badge?: string;
}) {
  const t = useTranslations("pricing");

  return (
    <div
      className={`rounded-xl border p-6 flex flex-col ${
        highlighted
          ? "border-primary shadow-lg ring-1 ring-primary"
          : "border-border"
      }`}
    >
      {badge && (
        <span className="inline-flex self-start mb-3 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
          {badge}
        </span>
      )}
      <h3 className="text-lg font-semibold">{name}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{price}</span>
        {period && (
          <span className="text-sm text-muted-foreground">/{period}</span>
        )}
      </div>
      <ul className="mt-6 space-y-3 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <PurchaseButton
        planId={planId}
        label={t("subscribe")}
        highlighted={highlighted}
      />
    </div>
  );
}

export function PricingPlans() {
  const t = useTranslations("pricing");
  const [isYearly, setIsYearly] = useState(true); // AC-5: Default to yearly

  return (
    <>
      {/* Toggle — AC-1 */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span
          className={`text-sm font-medium ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}
        >
          {t("monthly")}
        </span>
        <button
          onClick={() => setIsYearly(!isYearly)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            isYearly ? "bg-primary" : "bg-muted"
          }`}
          aria-label={t("toggleBilling")}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              isYearly ? "translate-x-6" : ""
            }`}
          />
        </button>
        <span
          className={`text-sm font-medium ${isYearly ? "text-foreground" : "text-muted-foreground"}`}
        >
          {t("yearly")}
        </span>
        {isYearly && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            {t("savePercent")}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Free */}
        <div className="rounded-xl border border-border p-6 flex flex-col">
          <h3 className="text-lg font-semibold">{t("freeName")}</h3>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-bold">{t("freePrice")}</span>
          </div>
          <ul className="mt-6 space-y-3 flex-1">
            {[
              t("freeFeature1"),
              t("freeFeature2"),
              t("freeFeature3"),
              t("freeFeature4"),
            ].map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <button
            disabled
            className="mt-8 w-full py-2.5 rounded-lg font-medium text-sm bg-muted text-muted-foreground cursor-not-allowed"
          >
            {t("freeCta")}
          </button>
        </div>

        {/* 7-Day Pass */}
        <div className="rounded-xl border border-border p-6 flex flex-col">
          <h3 className="text-lg font-semibold">{t("passName")}</h3>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-bold">{t("passPrice")}</span>
            <span className="text-sm text-muted-foreground">
              /{t("passPeriod")}
            </span>
          </div>
          <ul className="mt-6 space-y-3 flex-1">
            {[t("passFeature1"), t("passFeature2"), t("passFeature3")].map(
              (feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              )
            )}
          </ul>
          <PurchaseButton
            planId="pass_7d"
            label={t("passCta")}
          />
        </div>

        {/* Plus */}
        <PlanCard
          name={t("plusName")}
          price={isYearly ? t("plusYearlyEquivalent") : t("plusPrice")}
          period={isYearly ? t("month") : t("plusPeriod")}
          features={[
            t("plusFeature1"),
            t("plusFeature2"),
            t("plusFeature3"),
            t("plusFeature4"),
          ]}
          planId={isYearly ? "plus_yearly" : "plus_monthly"}
          highlighted
          badge={t("recommended")}
        />

        {/* Pro */}
        <PlanCard
          name={t("proName")}
          price={isYearly ? t("proYearlyEquivalent") : t("proPrice")}
          period={isYearly ? t("month") : t("proPeriod")}
          features={[
            t("proFeature1"),
            t("proFeature2"),
            t("proFeature3"),
            t("proFeature4"),
            t("proFeature5"),
          ]}
          planId={isYearly ? "pro_yearly" : "pro_monthly"}
        />
      </div>
    </>
  );
}

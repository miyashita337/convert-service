"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

type ApiPlan = "free" | "starter" | "pro";

/** Rank API plans so we can show the highest plan across a user's keys. */
const PLAN_RANK: Record<ApiPlan, number> = { free: 0, starter: 1, pro: 2 };

interface DeveloperKey {
  plan?: string;
}

/**
 * API プランのアップグレード導線（#357）。
 * ログイン状態と現プランを表示し、Stripe Checkout を起動する。
 */
export function ApiPlanUpgrade() {
  const { user, loading: authLoading, login } = useAuth();
  const locale = useLocale();
  const t = useTranslations("developers");

  const [currentPlan, setCurrentPlan] = useState<ApiPlan>("free");
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoadingPlan(true);
    fetch(`${API_URL}/api/developer/keys`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { keys?: DeveloperKey[] } | null) => {
        if (!data?.keys?.length) return;
        const highest = data.keys.reduce<ApiPlan>((acc, k) => {
          const p = (k.plan as ApiPlan) ?? "free";
          // 未知のプラン値は rank 0（free 相当）として安全に比較する
          return (PLAN_RANK[p] ?? 0) > (PLAN_RANK[acc] ?? 0) ? p : acc;
        }, "free");
        setCurrentPlan(highest);
      })
      .catch(() => {
        // Non-fatal: keep showing free tier
      })
      .finally(() => setLoadingPlan(false));
  }, [user]);

  const handleUpgrade = useCallback(
    async (planId: "api_starter_monthly" | "api_pro_monthly") => {
      if (!user) {
        login();
        return;
      }
      setSubmitting(planId);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/developer/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ planId, currency: "jpy", locale }),
        });
        const data = await res.json().catch(() => null);
        if (res.status === 503) {
          setError(t("upgradeComingSoon"));
          return;
        }
        if (!res.ok || !data?.url) {
          setError(t("upgradeError"));
          return;
        }
        window.location.href = data.url;
      } catch {
        setError(t("upgradeError"));
      } finally {
        setSubmitting(null);
      }
    },
    [user, login, locale, t],
  );

  // 現プラン名は developers namespace の pricing キーでローカライズ（pricingFree/Starter/Pro）
  const planLabelKey = (`pricing${currentPlan.charAt(0).toUpperCase()}${currentPlan.slice(1)}`) as "pricingFree";
  const planLabel = t(planLabelKey);

  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold text-center mb-6">{t("upgradeTitle")}</h2>

      {user && !authLoading && (
        <p className="text-center text-sm text-muted-foreground mb-8">
          {t("upgradeCurrentPlan")}:{" "}
          <span className="font-semibold text-foreground">{loadingPlan ? "…" : planLabel}</span>
        </p>
      )}

      {currentPlan === "pro" ? (
        <p className="text-center text-sm text-muted-foreground">{t("upgradeManage")}</p>
      ) : (
        <div className="flex gap-4 justify-center flex-wrap">
          {currentPlan !== "starter" && (
            <button
              onClick={() => handleUpgrade("api_starter_monthly")}
              disabled={submitting !== null}
              className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {submitting === "api_starter_monthly" ? "…" : !user ? t("upgradeLogin") : t("upgradeStarter")}
            </button>
          )}
          <button
            onClick={() => handleUpgrade("api_pro_monthly")}
            disabled={submitting !== null}
            className="inline-flex items-center px-6 py-3 rounded-lg border border-border font-semibold hover:bg-accent transition-colors disabled:opacity-60"
          >
            {submitting === "api_pro_monthly" ? "…" : !user ? t("upgradeLogin") : t("upgradePro")}
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-500 text-center">{error}</p>}
    </section>
  );
}

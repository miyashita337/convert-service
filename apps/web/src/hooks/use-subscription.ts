"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export type Plan = "free" | "pass" | "plus" | "pro";

interface SubscriptionState {
  plan: Plan;
  isPaid: boolean;
  isLoading: boolean;
  expiresAt: Date | null;
}

/** Dev override: set NEXT_PUBLIC_DEV_FORCE_PLAN=pro in .env.local */
const DEV_FORCE_PLAN = process.env.NEXT_PUBLIC_DEV_FORCE_PLAN as Plan | undefined;

export function useSubscription(): SubscriptionState {
  const [plan, setPlan] = useState<Plan>(DEV_FORCE_PLAN || "free");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(!DEV_FORCE_PLAN);

  const fetchSubscription = useCallback(async () => {
    // Skip API call when dev override is active
    if (DEV_FORCE_PLAN) return;

    try {
      const res = await fetch(`${API_URL}/api/account`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      const data = await res.json();

      const fetchedPlan = (data.plan as Plan) ?? "free";
      setPlan(fetchedPlan);

      if (data.activePurchase?.expiresAt) {
        setExpiresAt(new Date(data.activePurchase.expiresAt));
      } else {
        setExpiresAt(null);
      }
    } catch {
      // On error, default to free (ads shown) — fail-open for monetization
      setPlan("free");
      setExpiresAt(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Check if a pass has expired
  const isExpired = expiresAt !== null && expiresAt.getTime() < Date.now();
  const effectivePlan: Plan = isExpired ? "free" : plan;
  const isPaid = effectivePlan !== "free";

  return {
    plan: effectivePlan,
    isPaid,
    isLoading,
    expiresAt,
  };
}

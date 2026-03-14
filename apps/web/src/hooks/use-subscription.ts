"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * User subscription plan types.
 *
 * - "free"  : No active subscription or pass
 * - "pass"  : 7-day pass (one-time purchase)
 * - "plus"  : Plus monthly subscription
 * - "pro"   : Pro monthly subscription
 */
export type Plan = "free" | "pass" | "plus" | "pro";

interface SubscriptionState {
  /** Current plan. Defaults to "free". */
  plan: Plan;
  /** Whether the user has any paid plan (pass or subscription). */
  isPaid: boolean;
  /** Whether the subscription data is still loading. */
  isLoading: boolean;
  /** Expiration date for time-limited plans (pass). null if N/A. */
  expiresAt: Date | null;
}

/**
 * Hook to manage user subscription state.
 *
 * Current implementation: **STUB** (always returns free plan).
 *
 * When E3 (Stripe integration) is implemented, replace the stub
 * fetch with a real call to `/api/me` that returns:
 * ```json
 * { "plan": "plus", "expiresAt": null }
 * ```
 *
 * For passes:
 * ```json
 * { "plan": "pass", "expiresAt": "2026-03-22T00:00:00Z" }
 * ```
 */
export function useSubscription(): SubscriptionState {
  const [plan, setPlan] = useState<Plan>("free");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    try {
      // ── STUB: Replace with real API call when E3 is ready ──
      // const res = await fetch("/api/me");
      // if (!res.ok) throw new Error("Failed to fetch subscription");
      // const data = await res.json();
      // setPlan(data.plan ?? "free");
      // setExpiresAt(data.expiresAt ? new Date(data.expiresAt) : null);

      // Stub: always free
      setPlan("free");
      setExpiresAt(null);
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

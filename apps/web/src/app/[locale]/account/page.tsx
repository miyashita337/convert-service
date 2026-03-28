"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import { User, CreditCard, LogOut, BarChart3, Calendar } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

interface AccountInfo {
  email: string;
  plan: string;
  activePurchase: {
    plan: string;
    type: string;
    expiresAt: string | null;
  } | null;
  subscription: {
    planType: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

interface AccountInfoFull extends AccountInfo {
  usage: {
    remaining: number;
    limit: number;
  } | null;
}

export default function AccountPage() {
  const t = useTranslations("account");
  const { user, logout, login, loading: authLoading } = useAuth();
  const [accountInfo, setAccountInfo] = useState<AccountInfoFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetch(`${API_URL}/api/account`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then(setAccountInfo)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || (!user && loading)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">{t("loginRequired")}</h1>
        <p className="mt-4 text-muted-foreground">
          {t("loginRequiredDescription")}
        </p>
        <button
          onClick={login}
          className="mt-8 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium"
        >
          {t("signIn")}
        </button>
      </div>
    );
  }

  const handlePortal = async () => {
    const res = await fetch(`${API_URL}/api/account/portal`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const planLabel =
    accountInfo?.plan === "free"
      ? "Free"
      : accountInfo?.plan === "pass"
        ? "Pass"
        : accountInfo?.plan === "plus"
          ? "Plus"
          : accountInfo?.plan === "pro"
            ? "Pro"
            : accountInfo?.plan;

  const isPaid = accountInfo?.plan !== "free";

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="mt-8 space-y-6">
        {/* Profile — AC-2 */}
        <div className="rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{t("profile")}</h2>
          </div>
          <div className="flex items-center gap-4">
            {user.picture && (
              <img
                src={user.picture}
                alt=""
                className="h-12 w-12 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <div>
              {user.name && (
                <p className="font-medium">{user.name}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {accountInfo?.email || user.email}
              </p>
            </div>
          </div>
        </div>

        {/* Plan — AC-3 */}
        <div className="rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{t("plan")}</h2>
          </div>
          <p className="text-lg font-medium">{planLabel}</p>

          {/* Pass expiration */}
          {accountInfo?.activePurchase?.expiresAt && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("expiresAt")}:{" "}
              {new Date(
                accountInfo.activePurchase.expiresAt
              ).toLocaleDateString()}
            </p>
          )}

          {/* Cancel-at-period-end banner */}
          {accountInfo?.subscription?.cancelAtPeriodEnd &&
            accountInfo.subscription.currentPeriodEnd && (
              <div className="mt-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {t("cancelBanner", {
                    date: new Date(
                      accountInfo.subscription.currentPeriodEnd
                    ).toLocaleDateString(),
                  })}
                </p>
                <button
                  onClick={handlePortal}
                  className="mt-1 text-sm font-medium text-yellow-700 dark:text-yellow-300 underline hover:no-underline"
                >
                  {t("cancelBannerRevert")}
                </button>
              </div>
            )}

          {/* Subscription next renewal */}
          {accountInfo?.subscription?.currentPeriodEnd &&
            !accountInfo.subscription.cancelAtPeriodEnd && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {t("renewsAt")}:{" "}
                  {new Date(
                    accountInfo.subscription.currentPeriodEnd
                  ).toLocaleDateString()}
                </span>
              </div>
            )}

          <div className="mt-4 flex gap-3">
            {isPaid ? (
              <button
                onClick={handlePortal}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
              >
                {t("manageSubscription")}
              </button>
            ) : (
              <Link
                href="/pricing"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                {t("upgrade")}
              </Link>
            )}
          </div>
        </div>

        {/* Usage — AC-4 */}
        {accountInfo?.usage && (
          <div className="rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{t("usage")}</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, ((accountInfo.usage.limit - accountInfo.usage.remaining) / accountInfo.usage.limit) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {t("usageCount", {
                  used: accountInfo.usage.limit - accountInfo.usage.remaining,
                  limit: accountInfo.usage.limit,
                })}
              </span>
            </div>
          </div>
        )}

        {/* Logout — AC-7 */}
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </button>
      </div>
    </div>
  );
}

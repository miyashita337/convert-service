"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import { User, CreditCard, LogOut } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

interface AccountInfo {
  email: string;
  plan: string;
  activePurchase: {
    plan: string;
    type: string;
    expiresAt: string | null;
  } | null;
}

export default function AccountPage() {
  const t = useTranslations("account");
  const { user, logout, login } = useAuth();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/account`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then(setAccountInfo)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const handlePortal = async () => {
    const res = await fetch(`${API_URL}/api/account/portal`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  if (!user && !loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">{t("loginRequired")}</h1>
        <p className="mt-4 text-muted-foreground">{t("loginRequiredDescription")}</p>
        <button
          onClick={login}
          className="mt-8 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium"
        >
          {t("signIn")}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const planLabel = accountInfo?.plan === "free" ? "Free" :
    accountInfo?.plan === "pass" ? "Pass" :
    accountInfo?.plan === "plus" ? "Plus" :
    accountInfo?.plan === "pro" ? "Pro" : accountInfo?.plan;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="mt-8 space-y-6">
        {/* Profile */}
        <div className="rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{t("profile")}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{accountInfo?.email}</p>
        </div>

        {/* Plan */}
        <div className="rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{t("plan")}</h2>
          </div>
          <p className="text-lg font-medium">{planLabel}</p>
          {accountInfo?.activePurchase?.expiresAt && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("expiresAt")}: {new Date(accountInfo.activePurchase.expiresAt).toLocaleDateString()}
            </p>
          )}
          <div className="mt-4 flex gap-3">
            {accountInfo?.plan === "free" ? (
              <Link
                href="/pricing"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                {t("upgrade")}
              </Link>
            ) : (
              <button
                onClick={handlePortal}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
              >
                {t("manageSubscription")}
              </button>
            )}
          </div>
        </div>

        {/* Logout */}
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

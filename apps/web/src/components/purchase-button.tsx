"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

interface PurchaseButtonProps {
  planId: string;
  label: string;
  currency?: "jpy" | "usd";
  highlighted?: boolean;
  disabled?: boolean;
}

export function PurchaseButton({ planId, label, currency = "jpy", highlighted, disabled }: PurchaseButtonProps) {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    if (!user) { login(); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId, currency }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { /* silent */ } finally { setLoading(false); }
  };

  return (
    <button
      onClick={handlePurchase}
      disabled={disabled || loading}
      className={`mt-8 w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
        highlighted
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : disabled
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
      }`}
    >
      {loading ? "..." : label}
    </button>
  );
}

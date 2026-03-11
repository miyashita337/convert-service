"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter, usePathname } from "@/lib/i18n/navigation";
import { Globe } from "lucide-react";

export function Header() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const nextLocale = locale === "en" ? "ja" : "en";
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <header className="border-b border-border">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary">
          {t("siteName")}
        </Link>
        <button
          onClick={toggleLocale}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Globe className="h-4 w-4" />
          {locale === "en" ? "日本語" : "English"}
        </button>
      </div>
    </header>
  );
}

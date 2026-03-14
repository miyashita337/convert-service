import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";

export function Footer() {
  const t = useTranslations("common");

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">{t("privacy")}</p>
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            {t("privacyPolicy")}
          </Link>
          <span aria-hidden="true">|</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            {t("termsOfService")}
          </Link>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} QuickConv
        </p>
      </div>
    </footer>
  );
}

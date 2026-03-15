import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { POPULAR_CONVERSIONS } from "@quickconv/shared";

export function Footer() {
  const t = useTranslations("common");

  const topConversions = POPULAR_CONVERSIONS.slice(0, 6);

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
          {/* Brand */}
          <div>
            <Link href="/" className="text-lg font-bold text-primary">
              {t("siteName")}
            </Link>
            <p className="mt-2 text-muted-foreground">{t("privacy")}</p>
          </div>

          {/* Popular Conversions */}
          <div>
            <h3 className="font-semibold mb-3">{t("footerConversions")}</h3>
            <ul className="space-y-1.5">
              {topConversions.map((conv) => (
                <li key={conv.slug}>
                  <Link
                    href={`/convert/${conv.slug}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {conv.from.toUpperCase()} &rarr; {conv.to.toUpperCase()}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Guide */}
          <div>
            <h3 className="font-semibold mb-3">Legal</h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("termsOfService")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("contact")}
                </Link>
              </li>
              <li>
                <Link
                  href="/guide"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("guide")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} QuickConv
          </p>
        </div>
      </div>
    </footer>
  );
}

import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("common");

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">{t("privacy")}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} QuickConv
        </p>
      </div>
    </footer>
  );
}

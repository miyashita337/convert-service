import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const t = useTranslations("common");

  const allItems: BreadcrumbItem[] = [
    { label: t("home"), href: "/" },
    ...items,
  ];

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        {allItems.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
            )}
            {item.href && index < allItems.length - 1 ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

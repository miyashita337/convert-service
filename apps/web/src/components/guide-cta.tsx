import { Link } from "@/lib/i18n/navigation";
import { ArrowRight } from "lucide-react";

interface GuideCtaProps {
  href: string;
  label: string;
}

export function GuideCta({ href, label }: GuideCtaProps) {
  return (
    <div className="mt-4">
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

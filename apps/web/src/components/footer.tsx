import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { ImageIcon, Video, Music, FileText } from "lucide-react";

interface FooterConversion {
  slug: string;
  from: string;
  to: string;
}

interface FooterCategory {
  key: string;
  icon: React.ReactNode;
  conversions: FooterConversion[];
}

const FOOTER_CATEGORIES: FooterCategory[] = [
  {
    key: "image",
    icon: <ImageIcon className="h-4 w-4" />,
    conversions: [
      { slug: "heic-to-jpg", from: "heic", to: "jpg" },
      { slug: "png-to-webp", from: "png", to: "webp" },
      { slug: "webp-to-jpg", from: "webp", to: "jpg" },
      { slug: "avif-to-jpg", from: "avif", to: "jpg" },
      { slug: "jpg-to-webp", from: "jpg", to: "webp" },
      { slug: "svg-to-png", from: "svg", to: "png" },
    ],
  },
  {
    key: "video",
    icon: <Video className="h-4 w-4" />,
    conversions: [
      { slug: "mp4-to-gif", from: "mp4", to: "gif" },
      { slug: "mp4-to-mp3", from: "mp4", to: "mp3" },
    ],
  },
  {
    key: "audio",
    icon: <Music className="h-4 w-4" />,
    conversions: [
      { slug: "mp3-to-wav", from: "mp3", to: "wav" },
      { slug: "wav-to-mp3", from: "wav", to: "mp3" },
      { slug: "flac-to-mp3", from: "flac", to: "mp3" },
      { slug: "ogg-to-mp3", from: "ogg", to: "mp3" },
    ],
  },
  {
    key: "pdf",
    icon: <FileText className="h-4 w-4" />,
    conversions: [
      { slug: "jpg-to-pdf", from: "jpg", to: "pdf" },
      { slug: "png-to-pdf", from: "png", to: "pdf" },
    ],
  },
];

export function Footer() {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 text-sm">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <Link href="/" className="text-lg font-bold text-primary">
              {t("siteName")}
            </Link>
            <p className="mt-2 text-muted-foreground">{t("privacy")}</p>
          </div>

          {/* Category columns */}
          {FOOTER_CATEGORIES.map((cat) => (
            <div key={cat.key}>
              <h3 className="font-semibold mb-3 flex items-center gap-1.5">
                {cat.icon}
                {tNav(cat.key)}
              </h3>
              <ul className="space-y-1.5">
                {cat.conversions.map((conv) => (
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
          ))}
        </div>

        {/* Legal links */}
        <div className="mt-8 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} QuickConv
          </p>
          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("privacyPolicy")}
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("termsOfService")}
            </Link>
            <Link
              href="/legal/commercial-transactions"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("commercialTransactions")}
            </Link>
            <Link
              href="/contact"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("contact")}
            </Link>
            <Link
              href="/guide"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("guide")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

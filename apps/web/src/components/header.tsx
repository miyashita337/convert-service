"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter, usePathname } from "@/lib/i18n/navigation";
import {
  Globe,
  LogIn,
  LogOut,
  ChevronDown,
  Menu,
  X,
  ImageIcon,
  Video,
  Music,
  FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface CategoryLink {
  key: string;
  href: string;
  icon: React.ReactNode;
}

const CATEGORY_LINKS: CategoryLink[] = [
  { key: "image", href: "/", icon: <ImageIcon className="h-4 w-4" /> },
  {
    key: "video",
    href: "/convert/mp4-to-gif",
    icon: <Video className="h-4 w-4" />,
  },
  {
    key: "audio",
    href: "/convert/mp3-to-wav",
    icon: <Music className="h-4 w-4" />,
  },
  {
    key: "pdf",
    href: "/convert/jpg-to-pdf",
    icon: <FileText className="h-4 w-4" />,
  },
];

function isCategoryActive(pathname: string, category: CategoryLink): boolean {
  if (category.key === "image") {
    // Active on homepage or image conversion pages (not video/audio/pdf)
    return (
      pathname === "/" ||
      (pathname.startsWith("/convert/") &&
        !pathname.includes("mp4") &&
        !pathname.includes("mp3") &&
        !pathname.includes("wav") &&
        !pathname.includes("aac") &&
        !pathname.includes("flac") &&
        !pathname.includes("ogg") &&
        !pathname.includes("mov") &&
        !pathname.includes("avi") &&
        !pathname.includes("mkv") &&
        !pathname.includes("pdf"))
    );
  }
  if (category.key === "video") {
    return (
      pathname.includes("mp4") ||
      pathname.includes("mov") ||
      pathname.includes("avi") ||
      pathname.includes("mkv")
    );
  }
  if (category.key === "audio") {
    return (
      pathname.includes("mp3") ||
      pathname.includes("wav") ||
      pathname.includes("aac") ||
      pathname.includes("flac") ||
      pathname.includes("ogg")
    );
  }
  if (category.key === "pdf") {
    return pathname.includes("pdf");
  }
  return false;
}

export function Header() {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, login, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleLocale = () => {
    const nextLocale = locale === "en" ? "ja" : "en";
    router.replace(pathname, { locale: nextLocale });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="border-b border-border">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Logo + Category Nav */}
        <div className="flex items-center gap-1 sm:gap-4">
          <Link href="/" className="text-xl font-bold text-primary">
            {t("siteName")}
          </Link>

          {/* Desktop category nav */}
          <div className="hidden md:flex items-center gap-1 ml-2 border-l border-border pl-4">
            {CATEGORY_LINKS.map((cat) => {
              const active = isCategoryActive(pathname, cat);
              return (
                <Link
                  key={cat.key}
                  href={cat.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {cat.icon}
                  {tNav(cat.key)}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLocale}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">
              {locale === "en" ? "日本語" : "English"}
            </span>
          </button>

          {!loading && !user && (
            <button
              onClick={login}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
            >
              <LogIn className="h-4 w-4" />
              {t("login")}
            </button>
          )}

          {!loading && user && (
            <div className="relative hidden sm:block" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="inline-flex items-center gap-1.5 text-sm"
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name || user.email}
                    className="h-7 w-7 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                    {(user.name || user.email)[0].toUpperCase()}
                  </div>
                )}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-background shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium truncate">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={async () => {
                        await logout();
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-muted-foreground hover:bg-muted flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center p-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="max-w-5xl mx-auto px-4 py-3 space-y-1">
            {CATEGORY_LINKS.map((cat) => {
              const active = isCategoryActive(pathname, cat);
              return (
                <Link
                  key={cat.key}
                  href={cat.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {cat.icon}
                  {tNav(cat.key)}
                </Link>
              );
            })}

            <div className="border-t border-border pt-2 mt-2">
              {!loading && !user && (
                <button
                  onClick={() => {
                    login();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:text-primary/80 w-full"
                >
                  <LogIn className="h-4 w-4" />
                  {t("login")}
                </button>
              )}

              {!loading && user && (
                <>
                  <div className="px-3 py-2 flex items-center gap-2">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name || user.email}
                        className="h-7 w-7 rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                        {(user.name || user.email)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.name || user.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await logout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted w-full rounded-md"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("logout")}
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { routing } from "@/lib/i18n/routing";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
import { locales } from "@/lib/i18n/config";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { GoogleAnalytics } from "@/components/google-analytics";
import { CfAnalytics } from "@/components/cf-analytics";
import { CookieConsent } from "@/components/cookie-consent";
import { OrganizationJsonLd } from "@/components/json-ld";
import { AdSlot } from "@/components/ad-slot";
import { SentryInit } from "@/components/sentry-init";
import { GlobalErrorBoundary } from "@/components/error-boundary";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable}>
      <head>
        <meta
          name="keywords"
          content="image converter, file conversion, HEIC, WebP, AVIF, PNG, JPG, online converter"
        />
        <meta
          name="category"
          content="image converter, file conversion, HEIC, WebP, AVIF"
        />
        <OrganizationJsonLd />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <SentryInit />
        <GoogleAnalytics />
        <CfAnalytics />
        <NextIntlClientProvider messages={messages}>
          <GlobalErrorBoundary>
            <Header />
            <main className="flex-1">{children}</main>
            {/* Ad: Leaderboard above footer */}
            <div className="max-w-5xl mx-auto px-4 py-4">
              <AdSlot slot="footer-leaderboard" placement="leaderboard" />
            </div>
            <Footer />
          </GlobalErrorBoundary>
          <CookieConsent />
          <Toaster position="top-center" richColors />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { locales, defaultLocale, type Locale } from "./i18n/config";

const SITE_URL = "https://quickconv.cc";

function getAlternateLanguages(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] =
      locale === defaultLocale
        ? `${SITE_URL}${path}`
        : `${SITE_URL}/${locale}${path}`;
  }
  languages["x-default"] = `${SITE_URL}${path}`;
  return languages;
}

function getCanonicalUrl(locale: string, path: string): string {
  return locale === defaultLocale
    ? `${SITE_URL}${path}`
    : `${SITE_URL}/${locale}${path}`;
}

interface MetadataOptions {
  title: string;
  description: string;
  locale: Locale;
  path: string;
}

export function buildPageMetadata({
  title,
  description,
  locale,
  path,
}: MetadataOptions): Metadata {
  const canonicalUrl = getCanonicalUrl(locale, path);
  const ogImageUrl = `${SITE_URL}/og-image.png`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: getAlternateLanguages(path),
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "QuickConv",
      type: "website",
      locale: locale === "ja" ? "ja_JP" : "en_US",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: "QuickConv - Free Online Image Converter",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

import type { Locale } from "@/lib/i18n/config";

const SITE_URL = "https://quickconv.io";

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface JsonLdProps {
  locale: Locale;
}

interface WebApplicationJsonLdProps extends JsonLdProps {
  name: string;
  description: string;
}

interface HowToJsonLdProps extends JsonLdProps {
  from: string;
  to: string;
  name: string;
  description: string;
  steps: { name: string; text: string }[];
}

interface BreadcrumbJsonLdProps extends JsonLdProps {
  items: BreadcrumbItem[];
}

function getLocalizedUrl(locale: Locale, path: string): string {
  return locale === "en"
    ? `${SITE_URL}${path}`
    : `${SITE_URL}/${locale}${path}`;
}

export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "QuickConv",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebApplicationJsonLd({
  locale,
  name,
  description,
}: WebApplicationJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url: getLocalizedUrl(locale, "/"),
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    inLanguage: locale === "ja" ? "ja" : "en",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function HowToJsonLd({
  locale,
  from,
  to,
  name,
  description,
  steps,
}: HowToJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    url: getLocalizedUrl(
      locale,
      `/convert/${from.toLowerCase()}-to-${to.toLowerCase()}`,
    ),
    totalTime: "PT1M",
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
    inLanguage: locale === "ja" ? "ja" : "en",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ArticleJsonLdProps extends JsonLdProps {
  title: string;
  description: string;
  path: string;
}

export function ArticleJsonLd({
  locale,
  title,
  description,
  path,
}: ArticleJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: getLocalizedUrl(locale, path),
    publisher: {
      "@type": "Organization",
      name: "QuickConv",
      url: SITE_URL,
    },
    inLanguage: locale === "ja" ? "ja" : "en",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function BreadcrumbJsonLd({ locale, items }: BreadcrumbJsonLdProps) {
  const allItems: BreadcrumbItem[] = [
    { name: locale === "ja" ? "\u30DB\u30FC\u30E0" : "Home", href: "/" },
    ...items,
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: getLocalizedUrl(locale, item.href) } : {}),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

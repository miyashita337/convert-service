import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/breadcrumb";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { ApiPlanUpgrade } from "@/components/api-plan-upgrade";
import { locales, type Locale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildPageMetadata({
    title: t("developersTitle"),
    description: t("developersDescription"),
    locale: locale as Locale,
    path: "/developers",
  });
}

const CODE_EXAMPLES = {
  curl: `curl -X POST https://api.quickconv.cc/v1/convert \\
  -H "Authorization: Bearer qc_YOUR_API_KEY" \\
  -F "file=@photo.jpg" \\
  -F "output_format=webp"`,
  javascript: `const form = new FormData();
form.append("file", fs.readFileSync("photo.jpg"), "photo.jpg");
form.append("output_format", "webp");

const res = await fetch("https://api.quickconv.cc/v1/convert", {
  method: "POST",
  headers: { Authorization: "Bearer qc_YOUR_API_KEY" },
  body: form,
});
const { url } = await res.json();`,
  python: `import requests

res = requests.post(
    "https://api.quickconv.cc/v1/convert",
    headers={"Authorization": "Bearer qc_YOUR_API_KEY"},
    files={"file": open("photo.jpg", "rb")},
    data={"output_format": "webp"},
)
print(res.json()["url"])`,
};

const COMPETITORS = [
  { service: "QuickConv", price: "¥0 (free tier)", formats: "4 (WebP, AVIF, PNG, JPG)", focus: "Next-gen image formats" },
  { service: "CloudConvert", price: "$8/mo", formats: "200+", focus: "Universal conversion" },
  { service: "ConvertAPI", price: "$15/mo", formats: "Many", focus: "Document + image" },
  { service: "Cloudinary", price: "$89/mo", formats: "Many", focus: "CDN + transformation" },
];

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("developers");

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <BreadcrumbJsonLd
        locale={locale as Locale}
        items={[{ name: t("title") }]}
      />
      <Breadcrumb items={[{ label: t("title") }]} />

      {/* Hero */}
      <section className="text-center py-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
        <div className="mt-8 flex gap-4 justify-center flex-wrap">
          <a
            href="/account"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            {t("getApiKey")}
          </a>
          <a
            href="#docs"
            className="inline-flex items-center px-6 py-3 rounded-lg border border-border font-semibold hover:bg-accent transition-colors"
          >
            {t("viewDocs")}
          </a>
        </div>
      </section>

      {/* Why */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-center mb-10">{t("whyTitle")}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-2">
                {t(`why${i}Title` as "why1Title")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t(`why${i}Desc` as "why1Desc")}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Code Examples */}
      <section id="docs" className="py-12">
        <h2 className="text-2xl font-bold text-center mb-10">{t("codeTitle")}</h2>
        <div className="space-y-6">
          {Object.entries(CODE_EXAMPLES).map(([lang, code]) => (
            <div key={lang} className="rounded-xl border border-border overflow-hidden">
              <div className="bg-muted px-4 py-2 text-sm font-mono font-semibold uppercase">
                {lang}
              </div>
              <pre className="p-4 overflow-x-auto text-sm bg-muted text-foreground">
                <code>{code}</code>
              </pre>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Response: <code className="bg-muted px-2 py-1 rounded text-xs">
              {`{"url": "https://api.quickconv.cc/api/download/abc123", "format": "webp", "size": 45678, "expires_at": "..."}`}
            </code>
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-center mb-10">{t("pricingTitle")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(["Free", "Starter", "Pro", "Enterprise"] as const).map((plan) => {
            const key = plan.toLowerCase() as "free" | "starter" | "pro" | "enterprise";
            return (
              <div
                key={plan}
                className={`border rounded-xl p-6 ${key === "starter" ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
              >
                <h3 className="text-lg font-semibold">{t(`pricing${plan}` as "pricingFree")}</h3>
                <p className="text-3xl font-bold mt-2">
                  {t(`pricing${plan}Price` as "pricingFreePrice")}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t(`pricing${plan}Desc` as "pricingFreeDesc")}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Upgrade CTA (API plan billing — #357) */}
      <ApiPlanUpgrade />

      {/* Comparison */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-center mb-10">{t("compareTitle")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold">{t("compareService")}</th>
                <th className="text-left py-3 px-4 font-semibold">{t("comparePrice")}</th>
                <th className="text-left py-3 px-4 font-semibold">{t("compareFormats")}</th>
                <th className="text-left py-3 px-4 font-semibold">{t("compareFocus")}</th>
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map((c) => (
                <tr
                  key={c.service}
                  className={`border-b border-border ${c.service === "QuickConv" ? "bg-primary/5 font-semibold" : ""}`}
                >
                  <td className="py-3 px-4">{c.service}</td>
                  <td className="py-3 px-4">{c.price}</td>
                  <td className="py-3 px-4">{c.formats}</td>
                  <td className="py-3 px-4">{c.focus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <h2 className="text-3xl font-bold">{t("ctaTitle")}</h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          {t("ctaDesc")}
        </p>
        <a
          href="/account"
          className="inline-flex items-center mt-8 px-8 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-colors"
        >
          {t("getApiKey")}
        </a>
      </section>
    </div>
  );
}

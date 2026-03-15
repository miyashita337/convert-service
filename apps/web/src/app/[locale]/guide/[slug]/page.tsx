import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/breadcrumb";
import { BreadcrumbJsonLd, ArticleJsonLd } from "@/components/json-ld";
import { GuideCta } from "@/components/guide-cta";
import { GUIDE_SLUGS, isValidGuideSlug, type GuideSlug } from "@/lib/guide";
import { locales, type Locale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const GUIDE_NAMESPACE_MAP: Record<GuideSlug, string> = {
  "what-is-avif": "guideWhatIsAvif",
  "heic-to-jpg-guide": "guideHeicToJpg",
  "webp-vs-avif-vs-heic": "guideWebpVsAvifVsHeic",
};

const GUIDE_SEO_KEY_MAP: Record<GuideSlug, { title: string; description: string }> = {
  "what-is-avif": { title: "guideWhatIsAvifTitle", description: "guideWhatIsAvifDescription" },
  "heic-to-jpg-guide": { title: "guideHeicToJpgTitle", description: "guideHeicToJpgDescription" },
  "webp-vs-avif-vs-heic": { title: "guideWebpVsAvifVsHeicTitle", description: "guideWebpVsAvifVsHeicDescription" },
};

export async function generateStaticParams() {
  return locales.flatMap((locale) =>
    GUIDE_SLUGS.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isValidGuideSlug(slug)) return {};

  const t = await getTranslations({ locale, namespace: "seo" });
  const keys = GUIDE_SEO_KEY_MAP[slug];

  return buildPageMetadata({
    title: t(keys.title),
    description: t(keys.description),
    locale: locale as Locale,
    path: `/guide/${slug}`,
  });
}

export default async function GuideArticlePage({ params }: PageProps) {
  const { locale, slug } = await params;

  if (!isValidGuideSlug(slug)) {
    notFound();
  }

  setRequestLocale(locale);
  const tCommon = await getTranslations("common");
  const ns = GUIDE_NAMESPACE_MAP[slug];
  const t = await getTranslations(ns);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <BreadcrumbJsonLd
        locale={locale as Locale}
        items={[
          { name: tCommon("guide"), href: "/guide" },
          { name: t("title") },
        ]}
      />
      <ArticleJsonLd
        locale={locale as Locale}
        title={t("title")}
        description={t("description")}
        path={`/guide/${slug}`}
      />
      <Breadcrumb
        items={[
          { label: tCommon("guide"), href: "/guide" },
          { label: t("title") },
        ]}
      />

      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <time className="mt-2 block text-sm text-muted-foreground">
        {t("publishedAt")}
      </time>
      <p className="mt-6 text-muted-foreground leading-relaxed">{t("intro")}</p>

      {slug === "what-is-avif" && <WhatIsAvifContent t={t} tCommon={tCommon} />}
      {slug === "heic-to-jpg-guide" && <HeicToJpgContent t={t} tCommon={tCommon} />}
      {slug === "webp-vs-avif-vs-heic" && <WebpVsAvifVsHeicContent t={t} tCommon={tCommon} />}
    </div>
  );
}

interface ContentProps {
  t: (key: string) => string;
  tCommon: (key: string) => string;
}

function WhatIsAvifContent({ t, tCommon }: ContentProps) {
  return (
    <>
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("whatIsAvifTitle")}</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">{t("whatIsAvifText")}</p>

        <div className="mt-6 space-y-4">
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold">{t("whatIsAvifFeature1Title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("whatIsAvifFeature1Text")}</p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold">{t("whatIsAvifFeature2Title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("whatIsAvifFeature2Text")}</p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold">{t("whatIsAvifFeature3Title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("whatIsAvifFeature3Text")}</p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("browserSupportTitle")}</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">{t("browserSupportText")}</p>
        <ul className="mt-3 list-disc list-inside text-muted-foreground space-y-1.5">
          <li>{t("browserChrome")}</li>
          <li>{t("browserFirefox")}</li>
          <li>{t("browserSafari")}</li>
          <li>{t("browserEdge")}</li>
        </ul>
        <p className="mt-3 text-muted-foreground leading-relaxed">{t("browserNote")}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("conversionMethodsTitle")}</h2>

        <div className="mt-6">
          <h3 className="text-lg font-semibold">{t("method1Title")}</h3>
          <p className="mt-2 text-muted-foreground leading-relaxed">{t("method1Text")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("method1Steps")}</p>
          <GuideCta href="/convert/jpg-to-avif" label={tCommon("tryConverter")} />
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold">{t("method2Title")}</h3>
          <p className="mt-2 text-muted-foreground leading-relaxed">{t("method2Text")}</p>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold">{t("method3Title")}</h3>
          <p className="mt-2 text-muted-foreground leading-relaxed">{t("method3Text")}</p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("comparisonTitle")}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-semibold">{t("comparisonHeaderMethod")}</th>
                <th className="text-left py-2 pr-4 font-semibold">{t("comparisonHeaderEase")}</th>
                <th className="text-left py-2 pr-4 font-semibold">{t("comparisonHeaderBatch")}</th>
                <th className="text-left py-2 pr-4 font-semibold">{t("comparisonHeaderQuality")}</th>
                <th className="text-left py-2 font-semibold">{t("comparisonHeaderCost")}</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border">
                <td className="py-2 pr-4 font-medium text-foreground">QuickConv</td>
                <td className="py-2 pr-4">{t("comparisonOnlineEase")}</td>
                <td className="py-2 pr-4">{t("comparisonOnlineBatch")}</td>
                <td className="py-2 pr-4">{t("comparisonOnlineQuality")}</td>
                <td className="py-2">{t("comparisonOnlineCost")}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4 font-medium text-foreground">CLI</td>
                <td className="py-2 pr-4">{t("comparisonCliEase")}</td>
                <td className="py-2 pr-4">{t("comparisonCliBatch")}</td>
                <td className="py-2 pr-4">{t("comparisonCliQuality")}</td>
                <td className="py-2">{t("comparisonCliCost")}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-foreground">Software</td>
                <td className="py-2 pr-4">{t("comparisonSoftwareEase")}</td>
                <td className="py-2 pr-4">{t("comparisonSoftwareBatch")}</td>
                <td className="py-2 pr-4">{t("comparisonSoftwareQuality")}</td>
                <td className="py-2">{t("comparisonSoftwareCost")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("conclusionTitle")}</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">{t("conclusionText")}</p>
        <GuideCta href="/convert/jpg-to-avif" label={tCommon("tryConverter")} />
      </section>
    </>
  );
}

function HeicToJpgContent({ t, tCommon }: ContentProps) {
  return (
    <>
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("whatIsHeicTitle")}</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">{t("whatIsHeicText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("whyIphoneTitle")}</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">{t("whyIphoneText")}</p>
        <ul className="mt-3 list-disc list-inside text-muted-foreground space-y-1.5">
          <li>{t("whyIphoneReason1")}</li>
          <li>{t("whyIphoneReason2")}</li>
          <li>{t("whyIphoneReason3")}</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("problemTitle")}</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">{t("problemText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("method1Title")}</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">{t("method1Text")}</p>
        <ol className="mt-3 list-decimal list-inside text-muted-foreground space-y-1.5">
          <li>{t("method1Step1")}</li>
          <li>{t("method1Step2")}</li>
          <li>{t("method1Step3")}</li>
          <li>{t("method1Step4")}</li>
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">{t("method1Advantage")}</p>
        <GuideCta href="/convert/heic-to-jpg" label={tCommon("tryConverter")} />
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("method2Title")}</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">{t("method2Text")}</p>
        <ol className="mt-3 list-decimal list-inside text-muted-foreground space-y-1.5">
          <li>{t("method2Step1")}</li>
          <li>{t("method2Step2")}</li>
          <li>{t("method2Step3")}</li>
          <li>{t("method2Step4")}</li>
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">{t("method2Note")}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("method3Title")}</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">{t("method3Text")}</p>
        <ol className="mt-3 list-decimal list-inside text-muted-foreground space-y-1.5">
          <li>{t("method3Step1")}</li>
          <li>{t("method3Step2")}</li>
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">{t("method3Note")}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("comparisonTitle")}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-semibold">{t("comparisonHeaderMethod")}</th>
                <th className="text-left py-2 pr-4 font-semibold">{t("comparisonHeaderBestFor")}</th>
                <th className="text-left py-2 pr-4 font-semibold">{t("comparisonHeaderSpeed")}</th>
                <th className="text-left py-2 pr-4 font-semibold">{t("comparisonHeaderBatch")}</th>
                <th className="text-left py-2 font-semibold">{t("comparisonHeaderPlatform")}</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border">
                <td className="py-2 pr-4 font-medium text-foreground">QuickConv</td>
                <td className="py-2 pr-4">{t("comparisonOnlineBestFor")}</td>
                <td className="py-2 pr-4">{t("comparisonOnlineSpeed")}</td>
                <td className="py-2 pr-4">{t("comparisonOnlineBatch")}</td>
                <td className="py-2">{t("comparisonOnlinePlatform")}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4 font-medium text-foreground">macOS Preview</td>
                <td className="py-2 pr-4">{t("comparisonPreviewBestFor")}</td>
                <td className="py-2 pr-4">{t("comparisonPreviewSpeed")}</td>
                <td className="py-2 pr-4">{t("comparisonPreviewBatch")}</td>
                <td className="py-2">{t("comparisonPreviewPlatform")}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-foreground">iPhone Settings</td>
                <td className="py-2 pr-4">{t("comparisonSettingsBestFor")}</td>
                <td className="py-2 pr-4">{t("comparisonSettingsSpeed")}</td>
                <td className="py-2 pr-4">{t("comparisonSettingsBatch")}</td>
                <td className="py-2">{t("comparisonSettingsPlatform")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("conclusionTitle")}</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">{t("conclusionText")}</p>
        <GuideCta href="/convert/heic-to-jpg" label={tCommon("tryConverter")} />
      </section>
    </>
  );
}

function WebpVsAvifVsHeicContent({ t, tCommon }: ContentProps) {
  const comparisonRows = [
    { key: "Codec", webp: "comparisonRowCodecWebp", avif: "comparisonRowCodecAvif", heic: "comparisonRowCodecHeic" },
    { key: "Developer", webp: "comparisonRowDeveloperWebp", avif: "comparisonRowDeveloperAvif", heic: "comparisonRowDeveloperHeic" },
    { key: "Year", webp: "comparisonRowYearWebp", avif: "comparisonRowYearAvif", heic: "comparisonRowYearHeic" },
    { key: "Lossy", webp: "comparisonRowLossyAll", avif: "comparisonRowLossyAll", heic: "comparisonRowLossyAll" },
    { key: "Lossless", webp: "comparisonRowLosslessAll", avif: "comparisonRowLosslessAll", heic: "comparisonRowLosslessAll" },
    { key: "Transparency", webp: "comparisonRowTransparencyAll", avif: "comparisonRowTransparencyAll", heic: "comparisonRowTransparencyAll" },
    { key: "Animation", webp: "comparisonRowAnimationWebp", avif: "comparisonRowAnimationAvif", heic: "comparisonRowAnimationHeic" },
    { key: "Hdr", webp: "comparisonRowHdrWebp", avif: "comparisonRowHdrAvif", heic: "comparisonRowHdrHeic" },
    { key: "ColorDepth", webp: "comparisonRowColorDepthWebp", avif: "comparisonRowColorDepthAvif", heic: "comparisonRowColorDepthHeic" },
    { key: "MaxRes", webp: "comparisonRowMaxResWebp", avif: "comparisonRowMaxResAvif", heic: "comparisonRowMaxResHeic" },
    { key: "License", webp: "comparisonRowLicenseWebp", avif: "comparisonRowLicenseAvif", heic: "comparisonRowLicenseHeic" },
  ];

  return (
    <>
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("overviewTitle")}</h2>

        <div className="mt-6">
          <h3 className="text-lg font-semibold">{t("webpTitle")}</h3>
          <p className="mt-2 text-muted-foreground leading-relaxed">{t("webpText")}</p>
        </div>
        <div className="mt-6">
          <h3 className="text-lg font-semibold">{t("avifTitle")}</h3>
          <p className="mt-2 text-muted-foreground leading-relaxed">{t("avifText")}</p>
        </div>
        <div className="mt-6">
          <h3 className="text-lg font-semibold">{t("heicTitle")}</h3>
          <p className="mt-2 text-muted-foreground leading-relaxed">{t("heicText")}</p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("comparisonTableTitle")}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-semibold">{t("comparisonHeaderFeature")}</th>
                <th className="text-left py-2 pr-4 font-semibold">WebP</th>
                <th className="text-left py-2 pr-4 font-semibold">AVIF</th>
                <th className="text-left py-2 font-semibold">HEIC</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {comparisonRows.map((row) => (
                <tr key={row.key} className="border-b border-border">
                  <td className="py-2 pr-4 font-medium text-foreground">{t(`comparisonRow${row.key}`)}</td>
                  <td className="py-2 pr-4">{t(row.webp)}</td>
                  <td className="py-2 pr-4">{t(row.avif)}</td>
                  <td className="py-2">{t(row.heic)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("browserSupportTitle")}</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">{t("browserSupportText")}</p>
        <ul className="mt-3 list-disc list-inside text-muted-foreground space-y-1.5">
          <li>{t("browserWebpSupport")}</li>
          <li>{t("browserAvifSupport")}</li>
          <li>{t("browserHeicSupport")}</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("compressionTitle")}</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">{t("compressionText")}</p>
        <ul className="mt-3 list-disc list-inside text-muted-foreground space-y-1.5">
          <li>{t("compressionJpeg")}</li>
          <li>{t("compressionWebp")}</li>
          <li>{t("compressionAvif")}</li>
          <li>{t("compressionHeic")}</li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">{t("compressionNote")}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("useCasesTitle")}</h2>

        <div className="mt-6 space-y-6">
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold">{t("useCaseWebTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("useCaseWebText")}</p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold">{t("useCasePhotoTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("useCasePhotoText")}</p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold">{t("useCaseMobileTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("useCaseMobileText")}</p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold">{t("useCaseSocialTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("useCaseSocialText")}</p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("conversionTitle")}</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">{t("conversionText")}</p>
        <GuideCta href="/" label={tCommon("tryConverter")} />
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{t("conclusionTitle")}</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">{t("conclusionText")}</p>
        <GuideCta href="/" label={tCommon("tryConverter")} />
      </section>
    </>
  );
}

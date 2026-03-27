import { useTranslations } from "next-intl";
import { getFormatMeta } from "@/lib/format-metadata";
import { getConversionCategory } from "@quickconv/shared";

interface ConvertPageContentProps {
  from: string;
  to: string;
}

export function ConvertPageContent({ from, to }: ConvertPageContentProps) {
  const t = useTranslations("convertPages");
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();

  const fromMeta = getFormatMeta(fromLower);
  const toMeta = getFormatMeta(toLower);
  const category = getConversionCategory(fromLower);
  const isImage = category === "image";

  return (
    <div className="mt-16 space-y-16">
      {/* About Section */}
      <section>
        <h2 className="text-2xl font-bold tracking-tight">
          {t("aboutTitle", { from: fromUpper, to: toUpper })}
        </h2>
        <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
          <p>{t("aboutDescription", { from: fromUpper, to: toUpper })}</p>
          {t.has(`formatDescriptions.${fromLower}`) && (
            <p>
              <strong>{fromUpper}:</strong>{" "}
              {t(`formatDescriptions.${fromLower}`)}
            </p>
          )}
          {t.has(`formatDescriptions.${toLower}`) && (
            <p>
              <strong>{toUpper}:</strong> {t(`formatDescriptions.${toLower}`)}
            </p>
          )}
        </div>
      </section>

      {/* Comparison Table - only for image formats with metadata */}
      {fromMeta && toMeta && isImage && (
        <section>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("comparisonTitle", { from: fromUpper, to: toUpper })}
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-4 text-left font-semibold">
                    {t("comparisonHeaderFeature")}
                  </th>
                  <th className="py-3 px-4 text-left font-semibold">
                    {fromUpper}
                  </th>
                  <th className="py-3 px-4 text-left font-semibold">
                    {toUpper}
                  </th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <ComparisonRow
                  label={t("formatProperties.compressionLabel")}
                  fromValue={t(`formatProperties.${fromMeta.compression}`)}
                  toValue={t(`formatProperties.${toMeta.compression}`)}
                />
                <ComparisonRow
                  label={t("formatProperties.transparencyLabel")}
                  fromValue={t(
                    `formatProperties.${fromMeta.transparency ? "yes" : "no"}`,
                  )}
                  toValue={t(
                    `formatProperties.${toMeta.transparency ? "yes" : "no"}`,
                  )}
                />
                <ComparisonRow
                  label={t("formatProperties.animationLabel")}
                  fromValue={t(
                    `formatProperties.${fromMeta.animation ? "yes" : "no"}`,
                  )}
                  toValue={t(
                    `formatProperties.${toMeta.animation ? "yes" : "no"}`,
                  )}
                />
                <ComparisonRow
                  label={t("formatProperties.browserSupportLabel")}
                  fromValue={t(
                    `formatProperties.${fromMeta.browserSupport}`,
                  )}
                  toValue={t(`formatProperties.${toMeta.browserSupport}`)}
                />
                <ComparisonRow
                  label={t("formatProperties.maxColorsLabel")}
                  fromValue={t(`formatProperties.${fromMeta.maxColors}`)}
                  toValue={t(`formatProperties.${toMeta.maxColors}`)}
                />
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section>
        <h2 className="text-2xl font-bold tracking-tight">
          {t("faqTitle")}
        </h2>
        <div className="mt-4 space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <details
              key={i}
              className="group border rounded-lg"
              open={i === 1}
            >
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 font-medium hover:bg-muted/50 transition-colors">
                {t(`faq${i}Question`, { from: fromUpper, to: toUpper })}
                <span className="ml-2 text-muted-foreground transition-transform group-open:rotate-180">
                  ▼
                </span>
              </summary>
              <p className="px-4 pb-4 text-muted-foreground leading-relaxed">
                {t(`faq${i}Answer`, { from: fromUpper, to: toUpper })}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function ComparisonRow({
  label,
  fromValue,
  toValue,
}: {
  label: string;
  fromValue: string;
  toValue: string;
}) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="py-3 px-4 font-medium text-foreground">{label}</td>
      <td className="py-3 px-4">{fromValue}</td>
      <td className="py-3 px-4">{toValue}</td>
    </tr>
  );
}

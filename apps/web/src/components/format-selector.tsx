"use client";

import { useTranslations } from "next-intl";
import { CONVERSION_PAIRS, MIME_TO_FORMAT } from "@quickconv/shared";
import type { OutputFormat } from "@quickconv/shared";

interface FormatSelectorProps {
  file: File | null;
  selectedFormat: OutputFormat | null;
  onSelectFormat: (format: OutputFormat) => void;
}

export function FormatSelector({ file, selectedFormat, onSelectFormat }: FormatSelectorProps) {
  const t = useTranslations("common");

  if (!file) return null;

  const inputFormat = MIME_TO_FORMAT[file.type];
  const availableFormats = inputFormat ? CONVERSION_PAIRS[inputFormat] || [] : [];

  if (availableFormats.length === 0) return null;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{t("selectFormat")}</label>
      <div className="flex flex-wrap gap-2">
        {availableFormats.map((format) => (
          <button
            key={format}
            onClick={() => onSelectFormat(format)}
            className={`px-4 py-2 rounded-lg text-sm font-medium uppercase transition-colors ${
              selectedFormat === format
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-primary/10"
            }`}
          >
            {format}
          </button>
        ))}
      </div>
    </div>
  );
}

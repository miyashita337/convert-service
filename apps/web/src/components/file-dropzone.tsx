"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  ANONYMOUS_MAX_BATCH_FILES,
} from "@quickconv/shared";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  remainingConversions?: number | null;
}

export function FileDropzone({ onFileSelect, disabled, remainingConversions }: FileDropzoneProps) {
  const t = useTranslations("common");

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      // Calculate effective limit: min of batch limit and remaining conversions
      const batchLimit = ANONYMOUS_MAX_BATCH_FILES;
      const effectiveLimit =
        remainingConversions !== null && remainingConversions !== undefined
          ? Math.min(batchLimit, remainingConversions)
          : batchLimit;

      if (effectiveLimit <= 0) {
        toast.warning(t("rateLimitReached"));
        return;
      }

      if (acceptedFiles.length > effectiveLimit) {
        // Show toast with the effective limit
        if (
          remainingConversions !== null &&
          remainingConversions !== undefined &&
          remainingConversions < batchLimit
        ) {
          toast.warning(t("batchLimitByRemaining", { count: remainingConversions }));
        } else {
          toast.warning(t("batchLimitExceeded", { limit: batchLimit }));
        }
      }

      // Take only the first file (single-file conversion for now)
      // When batch conversion is supported, this will send up to effectiveLimit files
      onFileSelect(acceptedFiles[0]);
    },
    [onFileSelect, remainingConversions, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.fromEntries(ALLOWED_MIME_TYPES.map((m) => [m, []])),
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: true,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-xl p-6 md:p-12 text-center cursor-pointer transition-colors",
        isDragActive
          ? "border-primary bg-accent"
          : "border-border hover:border-primary hover:bg-accent/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
      <p className="text-lg font-medium">{t("dragDrop")}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("maxSize", { size: MAX_FILE_SIZE_MB })}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{t("supportedFormats")}</p>
    </div>
  );
}

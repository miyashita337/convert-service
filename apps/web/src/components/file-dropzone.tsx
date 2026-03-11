"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } from "@quickconv/shared";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFileSelect, disabled }: FileDropzoneProps) {
  const t = useTranslations("common");

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.fromEntries(ALLOWED_MIME_TYPES.map((m) => [m, []])),
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: false,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors",
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

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { FileDropzone } from "./file-dropzone";
import { FormatSelector } from "./format-selector";
import { ProgressBar } from "./progress-bar";
import { useConversion } from "@/hooks/use-conversion";
import type { ImageFormat } from "@quickconv/shared";

export function ConversionCard() {
  const t = useTranslations("common");
  const [file, setFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState<ImageFormat | null>(null);
  const { step, uploadProgress, downloadUrl, error, startConversion, reset } = useConversion();

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setOutputFormat(null);
    reset();
  };

  const handleConvert = () => {
    if (file && outputFormat) {
      startConversion(file, outputFormat);
    }
  };

  const handleReset = () => {
    setFile(null);
    setOutputFormat(null);
    reset();
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Step 1: File Selection */}
      {step === "idle" && (
        <>
          <FileDropzone onFileSelect={handleFileSelect} />

          {file && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          <FormatSelector
            file={file}
            selectedFormat={outputFormat}
            onSelectFormat={setOutputFormat}
          />

          {file && outputFormat && (
            <button
              onClick={handleConvert}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              {t("startConversion")}
            </button>
          )}
        </>
      )}

      {/* Step 2: Uploading */}
      {step === "uploading" && (
        <div className="rounded-xl border border-border p-8 text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="font-medium">{t("upload")}...</p>
          <ProgressBar progress={uploadProgress} />
        </div>
      )}

      {/* Step 3: Converting */}
      {step === "converting" && (
        <div className="rounded-xl border border-border p-8 text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="font-medium">{t("processing")}</p>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary animate-pulse w-full" />
          </div>
        </div>
      )}

      {/* Step 4: Completed */}
      {step === "completed" && downloadUrl && (
        <div className="rounded-xl border border-border p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <Download className="h-6 w-6 text-green-600" />
          </div>
          <p className="font-medium text-green-600">{t("completed")}</p>
          <a
            href={downloadUrl}
            download
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            {t("downloadFile")}
          </a>
          <p className="text-xs text-muted-foreground">{t("expiresIn", { hours: 24 })}</p>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            {t("convertAnother")}
          </button>
        </div>
      )}

      {/* Error State */}
      {step === "failed" && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-8 text-center space-y-4">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="font-medium text-destructive">{t("failed")}</p>
          {error && <p className="text-sm text-muted-foreground">{error}</p>}
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            {t("convertAnother")}
          </button>
        </div>
      )}
    </div>
  );
}

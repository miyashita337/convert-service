"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Download,
  RefreshCw,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Eye,
  FileVideo,
  FileAudio,
  Shield,
  Clock,
  Trash2,
} from "lucide-react";
import { FileDropzone } from "./file-dropzone";
import { FormatSelector } from "./format-selector";
import { ProgressBar } from "./progress-bar";
import { UpgradeModal } from "./upgrade-modal";
import { UpgradeBanner } from "./upgrade-banner";
import { ShareButtons } from "./share-buttons";
import { AdSlot } from "./ad-slot";
import { QualityPatternGrid } from "./quality-pattern-grid";
import { ImageCompareSlider } from "./image-compare-slider";
import { useConversion } from "@/hooks/use-conversion";
import { useSubscription } from "@/hooks/use-subscription";
import { useGAEvent } from "@/hooks/use-ga-event";
import { FREE_PREVIEW_LIMIT, isVideoMimeType, isAudioMimeType } from "@quickconv/shared";
import type { OutputFormat } from "@quickconv/shared";

/** Warning threshold: show warning when remaining <= this value */
const REMAINING_WARNING_THRESHOLD = 3;

export function ConversionCard() {
  const t = useTranslations("common");
  const tp = useTranslations("preview");
  const [file, setFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { plan, isPaid } = useSubscription();
  const {
    step,
    uploadProgress,
    downloadUrl,
    error,
    startConversion,
    startPreview,
    selectPreviewPattern,
    cancelPreview,
    convertWithSelectedQuality,
    reset,
    inputFormat,
    outputFormat: convOutputFormat,
    remainingConversions,
    dailyLimit,
    previews,
    selectedPreviewIndex,
    originalSize,
    recommendations,
    recommendationComputing,
    conversionProgress,
  } = useConversion();
  const { trackFileDownload } = useGAEvent();

  const isVideo = file ? isVideoMimeType(file.type) : false;
  const isAudio = file ? isAudioMimeType(file.type) : false;
  const isMediaFile = isVideo || isAudio;
  const isRateLimited = remainingConversions !== null && remainingConversions <= 0;
  const isLowRemaining =
    remainingConversions !== null &&
    remainingConversions > 0 &&
    remainingConversions <= REMAINING_WARNING_THRESHOLD;
  const hasRateLimitInfo = remainingConversions !== null && dailyLimit !== null;

  const accessibleCount = isPaid ? Infinity : FREE_PREVIEW_LIMIT;

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setOutputFormat(null);
    reset();
  };

  const handleConvert = () => {
    if (!file || !outputFormat) return;
    if (isRateLimited) {
      setShowUpgradeModal(true);
      return;
    }
    startConversion(file, outputFormat);
  };

  const handleCompareQuality = () => {
    if (!file || !outputFormat) return;
    startPreview(file, outputFormat, plan);
  };

  const handleConvertWithQuality = () => {
    if (isRateLimited) {
      setShowUpgradeModal(true);
      return;
    }
    convertWithSelectedQuality();
  };

  const handleBackFromPreview = () => {
    cancelPreview();
  };

  const handleReset = () => {
    setFile(null);
    setOutputFormat(null);
    reset();
  };

  // Selected preview item for the slider
  const selectedPreview = previews[selectedPreviewIndex];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Rate Limit Badge */}
      {hasRateLimitInfo && step === "idle" && (
        <div className="flex justify-end">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              isRateLimited
                ? "bg-destructive/10 text-destructive"
                : isLowRemaining
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {t("remainingCount", { remaining: remainingConversions, limit: dailyLimit })}
          </span>
        </div>
      )}

      {/* Rate Limit Warning */}
      {step === "idle" && isLowRemaining && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20 p-3 text-center">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {t("remainingWarning")}
          </p>
        </div>
      )}

      {/* Rate Limit Reached */}
      {step === "idle" && isRateLimited && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-center">
          <p className="text-sm text-destructive">
            {t("rateLimitReached")}
          </p>
        </div>
      )}

      {/* Step 1: File Selection */}
      {step === "idle" && (
        <>
          <FileDropzone
            onFileSelect={handleFileSelect}
            remainingConversions={remainingConversions}
          />

          {/* Benefit badges */}
          <BenefitBadges />

          {file && (
            <div className="rounded-lg bg-muted p-4 flex items-center gap-3">
              {isVideo && <FileVideo className="h-8 w-8 text-muted-foreground flex-shrink-0" />}
              {isAudio && <FileAudio className="h-8 w-8 text-muted-foreground flex-shrink-0" />}
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          )}

          <FormatSelector
            file={file}
            selectedFormat={outputFormat}
            onSelectFormat={setOutputFormat}
          />

          {file && outputFormat && (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleConvert}
                className="w-full py-3 rounded-lg font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t("startConversion")}
              </button>

              {/* Compare Quality button (image only, not for video/audio) */}
              {!isMediaFile && (
                <>
                  <button
                    onClick={handleCompareQuality}
                    className="w-full py-2.5 rounded-lg font-medium transition-colors border border-border text-foreground hover:bg-muted flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {tp("compareQuality")}
                  </button>

                  {/* Teaser for free users */}
                  {!isPaid && (
                    <p className="text-xs text-muted-foreground text-center">
                      {tp("freeTeaser")}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Ad: Leaderboard below tool description (idle state) */}
          <AdSlot slot="idle-leaderboard" placement="leaderboard" className="mt-6" />
        </>
      )}

      {/* Previewing: loading state */}
      {step === "previewing" && (
        <div className="rounded-xl border border-border p-8 text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="font-medium">{tp("generatingPreviews")}</p>
        </div>
      )}

      {/* Preview Ready: show quality grid + compare slider */}
      {step === "preview-ready" && previews.length > 0 && (
        <div className="space-y-6">
          {/* Back button */}
          <button
            onClick={handleBackFromPreview}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {tp("backToConversion")}
          </button>

          {/* File info */}
          {file && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {tp("originalSize")}: {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}

          {/* Quality Pattern Grid */}
          <div>
            <h3 className="text-sm font-medium mb-3">{tp("selectQuality")}</h3>
            <QualityPatternGrid
              previews={previews}
              originalSize={originalSize}
              selectedIndex={selectedPreviewIndex}
              onSelect={selectPreviewPattern}
              isPaid={isPaid}
              plan={plan}
              accessibleCount={accessibleCount}
              recommendations={recommendations}
              recommendationComputing={recommendationComputing}
            />
          </div>

          {/* Image Compare Slider */}
          {selectedPreview && file && (
            <div>
              <h3 className="text-sm font-medium mb-3">{tp("compareTitle")}</h3>
              <ImageCompareSlider
                beforeSrc={URL.createObjectURL(file)}
                afterSrc={selectedPreview.data}
                beforeSize={originalSize}
                afterSize={selectedPreview.size}
                beforeLabel={tp("original")}
                afterLabel={tp("converted")}
              />
            </div>
          )}

          {/* Convert with selected quality button */}
          <button
            onClick={handleConvertWithQuality}
            className="w-full py-3 rounded-lg font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {tp("convertWithQuality")}
          </button>
        </div>
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
        <>
          <div className="rounded-xl border border-border p-8 text-center space-y-4">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">{t("processing")}</p>
            {conversionProgress > 0 && conversionProgress < 100 ? (
              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${conversionProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{conversionProgress}%</p>
              </div>
            ) : (
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary animate-pulse w-full" />
              </div>
            )}
          </div>
          {/* Ad: Leaderboard during conversion (user waits here) */}
          <AdSlot slot="converting-leaderboard" placement="leaderboard" className="mt-4" />
        </>
      )}

      {/* Step 4: Completed */}
      {step === "completed" && downloadUrl && (
        <div className="rounded-xl border border-border p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <Download className="h-6 w-6 text-green-600" />
          </div>
          <p className="font-medium text-green-600">{t("completed")}</p>

          {/* Show remaining count after conversion */}
          {hasRateLimitInfo && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                isRateLimited
                  ? "bg-destructive/10 text-destructive"
                  : isLowRemaining
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {t("remainingCount", { remaining: remainingConversions, limit: dailyLimit })}
            </span>
          )}

          <a
            href={downloadUrl}
            download
            onClick={() => trackFileDownload(inputFormat, convOutputFormat)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            {t("downloadFile")}
          </a>
          <p className="text-xs text-muted-foreground">{t("expiresIn", { hours: 24 })}</p>

          {/* Share buttons */}
          <ShareButtons from={inputFormat} to={convOutputFormat} />

          {/* Ad: Rectangle below download button */}
          <AdSlot slot="completed-rectangle" placement="rectangle" className="mt-2" />

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

      {/* Upgrade Banner: shown after completing the last free conversion */}
      {step === "completed" && isRateLimited && (
        <UpgradeBanner visible />
      )}

      {/* Upgrade Modal: shown when user tries to convert with 0 remaining */}
      {dailyLimit !== null && (
        <UpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          dailyLimit={dailyLimit}
        />
      )}
    </div>
  );
}

function BenefitBadges() {
  const t = useTranslations("common");
  const badges = [
    { icon: Clock, label: t("benefitFast") },
    { icon: Shield, label: t("benefitNoSignup") },
    { icon: Trash2, label: t("benefitAutoDelete") },
  ] as const;

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {badges.map(({ icon: Icon, label }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
      ))}
    </div>
  );
}

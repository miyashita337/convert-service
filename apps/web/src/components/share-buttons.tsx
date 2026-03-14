"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonsProps {
  fromFormat: string;
  toFormat: string;
}

const SITE_URL = "https://quickconv.cc";

function buildShareUrl(from: string, to: string, source: string): string {
  const slug = `${from.toLowerCase()}-to-${to.toLowerCase()}`;
  return `${SITE_URL}/convert/${slug}?utm_source=${source}&utm_medium=social&utm_campaign=share`;
}

function buildShareText(from: string, to: string, locale: string): string {
  if (locale === "ja") {
    return `${from.toUpperCase()}→${to.toUpperCase()}の画像変換が無料でできた！ #QuickConv`;
  }
  return `Just converted ${from.toUpperCase()} to ${to.toUpperCase()} for free! #QuickConv`;
}

export function ShareButtons({ fromFormat, toFormat }: ShareButtonsProps) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);

  const shareUrl = buildShareUrl(fromFormat, toFormat, "direct");
  const shareText = buildShareText(fromFormat, toFormat, "en");

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `QuickConv - ${fromFormat.toUpperCase()} to ${toFormat.toUpperCase()}`,
          text: shareText,
          url: shareUrl,
        });
        trackShareEvent("web_share_api");
      } catch {
        // User cancelled share
      }
      return;
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t("linkCopied"));
      trackShareEvent("copy_link");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleXShare = () => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(buildShareUrl(fromFormat, toFormat, "twitter"))}`;
    window.open(url, "_blank", "width=550,height=420");
    trackShareEvent("x");
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(buildShareUrl(fromFormat, toFormat, "facebook"))}`;
    window.open(url, "_blank", "width=550,height=420");
    trackShareEvent("facebook");
  };

  const handleLineShare = () => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(buildShareUrl(fromFormat, toFormat, "line"))}`;
    window.open(url, "_blank", "width=550,height=420");
    trackShareEvent("line");
  };

  const trackShareEvent = (method: string) => {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "share", {
        method,
        content_type: "conversion",
        item_id: `${fromFormat}-to-${toFormat}`,
      });
    }
  };

  return (
    <div className="flex items-center gap-2 justify-center flex-wrap">
      {/* Web Share API (mobile) */}
      {typeof navigator !== "undefined" && navigator.share && (
        <button
          onClick={handleWebShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" />
          {t("share")}
        </button>
      )}

      {/* X (Twitter) */}
      <button
        onClick={handleXShare}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        aria-label="Share on X"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      {/* Facebook */}
      <button
        onClick={handleFacebookShare}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        aria-label="Share on Facebook"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </button>

      {/* LINE */}
      <button
        onClick={handleLineShare}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        aria-label="Share on LINE"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
      </button>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

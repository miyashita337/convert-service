"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { buildShareUrl, type ShareSource } from "@/lib/utm";
import { useGAEvent } from "@/hooks/use-ga-event";

interface ShareButtonsProps {
  /** Input format (e.g. "heic") */
  from: string;
  /** Output format (e.g. "jpg") */
  to: string;
  /** Page path for the share URL (default: "/") */
  path?: string;
}

/** X (Twitter) icon — inline SVG to avoid extra dependency */
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Facebook icon */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

/** LINE icon */
function LineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 5.82 2 10.5c0 4.21 3.74 7.74 8.79 8.4.34.07.81.23.93.52.1.27.07.68.03.95l-.15.9c-.05.27-.21 1.07.94.58 1.14-.49 6.17-3.63 8.42-6.22C22.86 13.47 22 11.82 22 10.5 22 5.82 17.52 2 12 2zm-3.44 11.19h-2.3a.47.47 0 01-.47-.47V8.53a.47.47 0 01.94 0v3.72h1.83a.47.47 0 010 .94zm1.54-.47a.47.47 0 01-.94 0V8.53a.47.47 0 01.94 0v4.19zm4.14 0a.47.47 0 01-.38.46.47.47 0 01-.5-.23l-2.1-2.86v2.63a.47.47 0 01-.93 0V8.53a.47.47 0 01.38-.46.47.47 0 01.5.22l2.1 2.87V8.53a.47.47 0 01.93 0v4.19zm3.14-3.25a.47.47 0 010 .94H15.9v.93h1.48a.47.47 0 010 .94H15.9v.93h1.48a.47.47 0 010 .94h-1.95a.47.47 0 01-.47-.47V8.53a.47.47 0 01.47-.47h1.95a.47.47 0 010 .94H15.9v.93h1.48z" />
    </svg>
  );
}

export function ShareButtons({ from, to, path = "/" }: ShareButtonsProps) {
  const t = useTranslations("share");
  const { trackShare } = useGAEvent();

  const shareText = t("shareText", { from: from.toUpperCase(), to: to.toUpperCase() });

  const openShareWindow = useCallback(
    (url: string, source: ShareSource) => {
      trackShare(source, from, to);
      window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
    },
    [trackShare, from, to],
  );

  const handleTwitter = useCallback(() => {
    const shareUrl = buildShareUrl(path, "twitter");
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    openShareWindow(url, "twitter");
  }, [path, shareText, openShareWindow]);

  const handleFacebook = useCallback(() => {
    const shareUrl = buildShareUrl(path, "facebook");
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    openShareWindow(url, "facebook");
  }, [path, openShareWindow]);

  const handleLine = useCallback(() => {
    const shareUrl = buildShareUrl(path, "line");
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    openShareWindow(url, "line");
  }, [path, shareText, openShareWindow]);

  const handleCopyLink = useCallback(async () => {
    const shareUrl = buildShareUrl(path, "copy_link");
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("linkCopied"));
      trackShare("copy_link", from, to);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success(t("linkCopied"));
      trackShare("copy_link", from, to);
    }
  }, [path, t, trackShare, from, to]);

  const handleNativeShare = useCallback(async () => {
    const shareUrl = buildShareUrl(path, "native_share");
    try {
      await navigator.share({
        title: "QuickConv",
        text: shareText,
        url: shareUrl,
      });
      trackShare("native_share", from, to);
    } catch (err) {
      // User cancelled or API error — ignore AbortError
      if ((err as DOMException).name !== "AbortError") {
        // Fallback to copy
        await handleCopyLink();
      }
    }
  }, [path, shareText, trackShare, from, to, handleCopyLink]);

  const supportsNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground text-center">{t("shareResult")}</p>
      <div className="flex items-center justify-center gap-2">
        {/* X (Twitter) */}
        <button
          type="button"
          onClick={handleTwitter}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-muted hover:bg-muted/80 transition-colors"
          aria-label={t("shareOnX")}
        >
          <XIcon className="h-4 w-4" />
        </button>

        {/* Facebook */}
        <button
          type="button"
          onClick={handleFacebook}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-muted hover:bg-muted/80 transition-colors"
          aria-label={t("shareOnFacebook")}
        >
          <FacebookIcon className="h-4 w-4" />
        </button>

        {/* LINE */}
        <button
          type="button"
          onClick={handleLine}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-muted hover:bg-muted/80 transition-colors"
          aria-label={t("shareOnLine")}
        >
          <LineIcon className="h-4 w-4" />
        </button>

        {/* Copy Link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-muted hover:bg-muted/80 transition-colors"
          aria-label={t("copyLink")}
        >
          <Copy className="h-4 w-4" />
        </button>

        {/* Native Share (mobile) */}
        {supportsNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            aria-label={t("nativeShare")}
          >
            <Share2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

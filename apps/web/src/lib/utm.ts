const SITE_URL = "https://quickconv.cc";

export type UtmSource =
  | "twitter"
  | "facebook"
  | "line"
  | "reddit"
  | "hackernews"
  | "producthunt"
  | "zenn"
  | "qiita"
  | "note"
  | "direct"
  | "email";

export type UtmMedium = "social" | "referral" | "email" | "organic";

export type UtmCampaign =
  | "share"
  | "launch"
  | "guide"
  | "blog"
  | "newsletter";

interface UtmParams {
  source: UtmSource;
  medium: UtmMedium;
  campaign: UtmCampaign;
  content?: string;
}

/**
 * Build a URL with UTM parameters.
 * @param path - Page path (e.g., "/convert/jpg-to-avif")
 * @param utm - UTM parameter object
 * @returns Full URL with UTM parameters
 */
export function buildUtmUrl(path: string, utm: UtmParams): string {
  const url = new URL(path, SITE_URL);
  url.searchParams.set("utm_source", utm.source);
  url.searchParams.set("utm_medium", utm.medium);
  url.searchParams.set("utm_campaign", utm.campaign);
  if (utm.content) {
    url.searchParams.set("utm_content", utm.content);
  }
  return url.toString();
}

/**
 * Build a share URL for social media.
 * @param fromFormat - Source format (e.g., "jpg")
 * @param toFormat - Target format (e.g., "avif")
 * @param source - Social platform
 */
export function buildShareUtmUrl(
  fromFormat: string,
  toFormat: string,
  source: UtmSource
): string {
  const slug = `${fromFormat.toLowerCase()}-to-${toFormat.toLowerCase()}`;
  return buildUtmUrl(`/convert/${slug}`, {
    source,
    medium: "social",
    campaign: "share",
    content: slug,
  });
}

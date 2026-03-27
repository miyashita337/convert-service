/**
 * UTM Parameter Builder for QuickConv share links
 *
 * UTM Taxonomy:
 * -------------------------------------------------------
 * | Parameter      | Value                | Description              |
 * |----------------|----------------------|--------------------------|
 * | utm_source     | twitter / facebook / | Which SNS or "copy_link" |
 * |                | line / copy_link /   |                          |
 * |                | native_share         |                          |
 * | utm_medium     | social               | Always "social" for shares|
 * | utm_campaign   | conversion_complete  | Share from result screen  |
 * -------------------------------------------------------
 *
 * Example output:
 *   https://quickconv.cc/?utm_source=twitter&utm_medium=social&utm_campaign=conversion_complete
 */

const SITE_URL = "https://quickconv.cc";

export type ShareSource =
  | "twitter"
  | "facebook"
  | "line"
  | "copy_link"
  | "native_share";

/**
 * Build a share URL with UTM parameters.
 *
 * @param path      - Page path (e.g. "/" or "/convert/heic-to-jpg")
 * @param source    - utm_source value (SNS name or "copy_link")
 * @param medium    - utm_medium value (default: "social")
 * @param campaign  - utm_campaign value (default: "conversion_complete")
 * @returns Full URL string with UTM query parameters
 */
export function buildShareUrl(
  path: string,
  source: ShareSource,
  medium = "social",
  campaign = "conversion_complete",
): string {
  const base = `${SITE_URL}${path}`;
  const url = new URL(base);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}

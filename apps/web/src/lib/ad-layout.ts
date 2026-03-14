/**
 * A/B test ad layout configuration.
 *
 * Controlled via the NEXT_PUBLIC_AD_LAYOUT environment variable.
 * - "default"  : baseline layout (current placements)
 * - "variant-a" : leaderboard above and below main content
 * - "variant-b" : rectangle-heavy layout (more 300x250 units)
 *
 * Unrecognised values fall back to "default".
 */

export type AdLayout = "default" | "variant-a" | "variant-b";

const VALID_LAYOUTS: readonly AdLayout[] = [
  "default",
  "variant-a",
  "variant-b",
] as const;

function resolveLayout(): AdLayout {
  const raw = process.env.NEXT_PUBLIC_AD_LAYOUT ?? "default";
  return VALID_LAYOUTS.includes(raw as AdLayout)
    ? (raw as AdLayout)
    : "default";
}

/** Current ad layout selected by the environment variable. */
export const AD_LAYOUT: AdLayout = resolveLayout();

export interface AdPlacementConfig {
  /** Whether the slot is enabled in this layout. */
  enabled: boolean;
  /** Placement type. */
  placement: "leaderboard" | "rectangle" | "mobile-banner";
}

type SlotName =
  | "idle-leaderboard"
  | "converting-leaderboard"
  | "completed-rectangle"
  | "footer-leaderboard"
  | "sidebar-rectangle";

/**
 * Per-layout configuration for each ad slot.
 *
 * When a slot is disabled it will not render, enabling quick A/B
 * testing without touching component code.
 */
const LAYOUT_CONFIGS: Record<AdLayout, Record<SlotName, AdPlacementConfig>> = {
  default: {
    "idle-leaderboard": { enabled: true, placement: "leaderboard" },
    "converting-leaderboard": { enabled: true, placement: "leaderboard" },
    "completed-rectangle": { enabled: true, placement: "rectangle" },
    "footer-leaderboard": { enabled: true, placement: "leaderboard" },
    "sidebar-rectangle": { enabled: false, placement: "rectangle" },
  },
  "variant-a": {
    "idle-leaderboard": { enabled: true, placement: "leaderboard" },
    "converting-leaderboard": { enabled: true, placement: "leaderboard" },
    "completed-rectangle": { enabled: false, placement: "rectangle" },
    "footer-leaderboard": { enabled: true, placement: "leaderboard" },
    "sidebar-rectangle": { enabled: false, placement: "rectangle" },
  },
  "variant-b": {
    "idle-leaderboard": { enabled: false, placement: "leaderboard" },
    "converting-leaderboard": { enabled: true, placement: "leaderboard" },
    "completed-rectangle": { enabled: true, placement: "rectangle" },
    "footer-leaderboard": { enabled: true, placement: "leaderboard" },
    "sidebar-rectangle": { enabled: true, placement: "rectangle" },
  },
};

/**
 * Retrieve the configuration for a specific ad slot.
 * Returns `{ enabled: false }` for unknown slot names.
 */
export function getAdSlotConfig(slotName: string): AdPlacementConfig {
  const config = LAYOUT_CONFIGS[AD_LAYOUT];
  return (
    config[slotName as SlotName] ?? { enabled: false, placement: "rectangle" }
  );
}

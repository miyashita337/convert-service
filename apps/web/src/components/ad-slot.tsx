"use client";

import { AdBanner } from "./ad-banner";

type AdPlacement = "leaderboard" | "rectangle" | "mobile-banner";

interface AdSlotProps {
  /** AdSense ad unit slot ID */
  slot: string;
  /** Placement type (determines responsive behavior) */
  placement: AdPlacement;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Responsive ad slot helper.
 *
 * - "leaderboard": 728x90 on desktop, 320x50 on mobile
 * - "rectangle": 300x250 (all sizes)
 * - "mobile-banner": 320x50 (mobile only, hidden on desktop)
 */
export function AdSlot({ slot, placement, className }: AdSlotProps) {
  if (placement === "leaderboard") {
    return (
      <div className={className}>
        {/* Desktop: 728x90 leaderboard */}
        <div className="hidden md:flex justify-center">
          <AdBanner slot={slot} format="leaderboard" />
        </div>
        {/* Mobile: 320x50 banner */}
        <div className="flex md:hidden justify-center">
          <AdBanner slot={slot} format="mobile-banner" />
        </div>
      </div>
    );
  }

  if (placement === "rectangle") {
    return (
      <div className={`flex justify-center ${className ?? ""}`}>
        <AdBanner slot={slot} format="rectangle" />
      </div>
    );
  }

  // mobile-banner: only shown on small screens
  return (
    <div className={`flex md:hidden justify-center ${className ?? ""}`}>
      <AdBanner slot={slot} format="mobile-banner" />
    </div>
  );
}

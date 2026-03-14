"use client";

import { useEffect } from "react";
import { initSentry } from "@/lib/sentry";

/**
 * Client component that initializes Sentry on mount.
 *
 * Placed in the layout so that Sentry is ready before any error can occur.
 * Renders nothing — purely a side-effect component.
 */
export function SentryInit() {
  useEffect(() => {
    initSentry();
  }, []);

  return null;
}

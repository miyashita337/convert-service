interface Window {
  gtag: (
    command: "config" | "consent" | "event" | "js" | "set",
    targetOrDate: string | Date,
    params?: Record<string, unknown>
  ) => void;
  dataLayer: unknown[];
}

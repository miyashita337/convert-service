interface Window {
  gtag: (
    command: "config" | "event" | "js" | "set",
    targetOrDate: string | Date,
    params?: Record<string, unknown>
  ) => void;
  dataLayer: unknown[];
}

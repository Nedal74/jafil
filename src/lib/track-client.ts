"use client";

export type TrackEvent =
  | "project_view"
  | "contact_form_submit"
  | "whatsapp_click"
  | "assistant_open"
  | "qualified_lead_submit"
  | "financing_submit";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * Pushes an analytics event. GA4/GTM only receive it when consent was granted
 * (Consent Mode handles that on Google's side). `dedupeKey` prevents duplicate
 * conversions in the same browser session (e.g. a double submit or a refresh).
 */
export function track(event: TrackEvent, params: Record<string, string | number | undefined> = {}, dedupeKey?: string) {
  if (typeof window === "undefined") return;
  if (dedupeKey) {
    const k = `trk:${event}:${dedupeKey}`;
    try {
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch {
      /* storage unavailable — still send once */
    }
  }
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

/** Anonymous, first-party CTA click counter (no personal data) used by the CRM dashboard. */
export function recordCtaClick(channel: "whatsapp" | "phone", projectId?: string) {
  try {
    const body = JSON.stringify({ channel, projectId, page: window.location.pathname });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/cta", new Blob([body], { type: "application/json" }));
    else void fetch("/api/cta", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  } catch {
    /* ignore */
  }
}

"use client";

import { useEffect, useState } from "react";

export function ConsentBanner({ text, accept, reject }: { text: string; accept: string; reject: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      setVisible(!localStorage.getItem("aljafil-consent"));
    } catch {
      setVisible(false);
    }
  }, []);
  if (!visible) return null;

  const decide = (granted: boolean) => {
    try {
      localStorage.setItem("aljafil-consent", granted ? "granted" : "denied");
    } catch {
      /* ignore */
    }
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.("consent", "update", { analytics_storage: granted ? "granted" : "denied" });
    setVisible(false);
  };

  return (
    <div role="region" aria-label="cookies" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] sm:bottom-5">
      <p className="text-sm leading-6 text-ink">{text}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-primary" onClick={() => decide(true)}>{accept}</button>
        <button type="button" className="btn-outline" onClick={() => decide(false)}>{reject}</button>
      </div>
    </div>
  );
}

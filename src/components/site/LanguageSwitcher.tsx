"use client";

import { usePathname } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";

/**
 * Switches language while keeping the visitor on the equivalent page. Pages with
 * localized slugs publish hreflang alternates; we follow those when present.
 */
export function LanguageSwitcher({ locale, label, className }: { locale: Locale; label: string; className?: string }) {
  const pathname = usePathname() || `/${locale}`;
  const target: Locale = locale === "ar" ? "en" : "ar";
  const fallback = pathname.replace(/^\/(ar|en)(?=\/|$)/, `/${target}`);

  return (
    <a
      href={fallback}
      hrefLang={target}
      lang={target}
      className={className}
      onClick={(e) => {
        const alt = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${target}"]`);
        document.cookie = `locale=${target}; path=/; max-age=31536000; samesite=lax`;
        if (alt?.href) {
          e.preventDefault();
          const url = new URL(alt.href);
          window.location.assign(url.pathname + window.location.search);
        }
      }}
    >
      {label}
    </a>
  );
}

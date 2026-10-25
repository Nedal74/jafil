import type { Metadata } from "next";

import { siteUrl } from "./env";
import type { Locale } from "./i18n/config";

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Builds localized metadata. `paths` holds the locale-specific path of the same
 * page (project/article slugs differ per language) for hreflang alternates.
 */
export function buildMetadata(opts: {
  locale: Locale;
  title: string;
  description?: string | null;
  paths: Record<Locale, string>;
  image?: string | null;
  canonical?: string | null;
  noindex?: boolean;
  type?: "website" | "article";
}): Metadata {
  const canonical = opts.canonical || absoluteUrl(opts.paths[opts.locale]);
  const description = opts.description?.slice(0, 300) || undefined;
  return {
    title: opts.title,
    description,
    alternates: {
      canonical,
      languages: {
        ar: absoluteUrl(opts.paths.ar),
        en: absoluteUrl(opts.paths.en),
        "x-default": absoluteUrl(opts.paths.ar),
      },
    },
    openGraph: {
      type: opts.type ?? "website",
      title: opts.title,
      description,
      url: canonical,
      locale: opts.locale === "ar" ? "ar_SA" : "en_US",
      images: opts.image ? [{ url: absoluteUrl(opts.image) }] : undefined,
    },
    twitter: { card: opts.image ? "summary_large_image" : "summary", title: opts.title, description },
    robots: opts.noindex ? { index: false, follow: false } : undefined,
  };
}

export function jsonLdScript(data: unknown): string {
  // Escape "<" so user-provided strings can't close the script tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

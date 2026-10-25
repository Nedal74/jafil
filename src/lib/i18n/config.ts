export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";

export function isLocale(v: string | undefined | null): v is Locale {
  return v === "ar" || v === "en";
}

export function dir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Pick the localized field: pick(project, "name", "en") -> project.nameEn ?? project.nameAr */
export function pick<T extends Record<string, unknown>>(obj: T, base: string, locale: Locale): string {
  const primary = obj[`${base}${locale === "ar" ? "Ar" : "En"}`];
  const fallback = obj[`${base}${locale === "ar" ? "En" : "Ar"}`];
  return (typeof primary === "string" && primary.trim() ? primary : typeof fallback === "string" ? fallback : "") as string;
}

export function otherLocale(locale: Locale): Locale {
  return locale === "ar" ? "en" : "ar";
}

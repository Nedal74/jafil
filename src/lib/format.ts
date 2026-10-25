import type { Locale } from "./i18n/config";

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US").format(n);
}

export function formatPrice(n: number, locale: Locale): string {
  return `${formatNumber(n, locale)} ${locale === "ar" ? "ريال" : "SAR"}`;
}

export function formatArea(n: number, locale: Locale): string {
  return `${formatNumber(Math.round(n * 10) / 10, locale)} ${locale === "ar" ? "م²" : "m²"}`;
}

export function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  fmt: (n: number) => string,
): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max) as number);
}

export function formatDate(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    dateStyle: "medium",
  }).format(d);
}

export function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "short", timeStyle: "short" }).format(d);
}

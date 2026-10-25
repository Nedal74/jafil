/** Server-side environment access with production safety checks. */

export const isProduction = process.env.NODE_ENV === "production";

export function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

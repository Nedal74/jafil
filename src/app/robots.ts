import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSetting("seo");
  if (!seo.indexingEnabled) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/ar/financing/thank-you", "/en/financing/thank-you"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}

import type { MetadataRoute } from "next";

import { prisma } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

const STATIC_PATHS = ["", "/projects", "/about", "/financing", "/news", "/contact", "/privacy"];

/** Only published, indexable pages; drafts, archived items and private areas never appear. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seo = await getSetting("seo");
  if (!seo.indexingEnabled) return [];

  const [projects, articles] = await Promise.all([
    prisma.project.findMany({ where: { status: "PUBLISHED" }, select: { slugAr: true, slugEn: true, updatedAt: true, canonicalUrl: true } }),
    prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
      select: { slugAr: true, slugEn: true, updatedAt: true },
    }),
  ]);

  const pair = (ar: string, en: string, lastModified?: Date): MetadataRoute.Sitemap =>
    (["ar", "en"] as const).map((l) => ({
      url: absoluteUrl(l === "ar" ? ar : en),
      lastModified,
      alternates: { languages: { ar: absoluteUrl(ar), en: absoluteUrl(en) } },
    }));

  return [
    ...STATIC_PATHS.flatMap((p) => pair(`/ar${p}`, `/en${p}`)),
    ...projects
      .filter((p) => !p.canonicalUrl) // pages canonicalised elsewhere are not listed
      .flatMap((p) => pair(`/ar/projects/${encodeURIComponent(p.slugAr)}`, `/en/projects/${encodeURIComponent(p.slugEn)}`, p.updatedAt)),
    ...articles.flatMap((a) => pair(`/ar/news/${encodeURIComponent(a.slugAr)}`, `/en/news/${encodeURIComponent(a.slugEn)}`, a.updatedAt)),
  ];
}

import { prisma } from "./db";

/**
 * When a published page's slug changes, keep old URLs working with a permanent
 * redirect. Existing redirects pointing at the old URL are re-targeted so no
 * redirect chains form, and a redirect *from* the new URL is removed.
 */
export async function recordSlugRedirects(
  old: { slugAr: string; slugEn: string },
  next: { slugAr: string; slugEn: string },
  base: "projects" | "news",
) {
  const pairs: [string, string][] = [];
  if (old.slugAr !== next.slugAr) pairs.push([`/ar/${base}/${old.slugAr}`, `/ar/${base}/${next.slugAr}`]);
  if (old.slugEn !== next.slugEn) pairs.push([`/en/${base}/${old.slugEn}`, `/en/${base}/${next.slugEn}`]);
  for (const [from, to] of pairs) {
    await prisma.redirect.updateMany({ where: { toPath: from }, data: { toPath: to } });
    await prisma.redirect.deleteMany({ where: { fromPath: to } });
    await prisma.redirect.upsert({ where: { fromPath: from }, create: { fromPath: from, toPath: to }, update: { toPath: to } });
  }
}

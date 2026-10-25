import { prisma } from "./db";

export const HOME_SECTION_KEYS = [
  "hero",
  "search",
  "intro",
  "chairman",
  "featured",
  "current",
  "completed",
  "stats",
  "advantages",
  "news",
  "cta",
] as const;
export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];

export const HOME_SECTION_LABELS: Record<HomeSectionKey, string> = {
  hero: "الواجهة الرئيسية (عرض المشاريع)",
  search: "لوحة البحث",
  intro: "نبذة عن الشركة",
  chairman: "كلمة رئيس مجلس الإدارة",
  featured: "المشاريع المميزة",
  current: "المشاريع الحالية",
  completed: "المشاريع المكتملة",
  stats: "إحصائيات الشركة",
  advantages: "المزايا والضمانات",
  news: "آخر الأخبار",
  cta: "دعوة للتواصل مع المبيعات",
};

export type HomeSectionConfig = {
  key: HomeSectionKey;
  enabled: boolean;
  order: number;
  titleAr: string | null;
  titleEn: string | null;
  subtitleAr: string | null;
  subtitleEn: string | null;
};

/** Returns every known section, creating missing rows so admins can always configure them. */
export async function getHomeSections(): Promise<HomeSectionConfig[]> {
  const rows = await prisma.homeSection.findMany();
  const known = new Map(rows.map((r) => [r.key, r]));
  const missing = HOME_SECTION_KEYS.filter((k) => !known.has(k));
  if (missing.length) {
    await prisma.homeSection.createMany({
      data: missing.map((key) => ({ key, order: HOME_SECTION_KEYS.indexOf(key) })),
      skipDuplicates: true,
    });
    for (const r of await prisma.homeSection.findMany({ where: { key: { in: missing } } })) known.set(r.key, r);
  }
  return HOME_SECTION_KEYS.map((key) => {
    const r = known.get(key)!;
    return {
      key,
      enabled: r.enabled,
      order: r.order,
      titleAr: r.titleAr,
      titleEn: r.titleEn,
      subtitleAr: r.subtitleAr,
      subtitleEn: r.subtitleEn,
    };
  }).sort((a, b) => a.order - b.order);
}

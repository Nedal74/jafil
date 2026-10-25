import "server-only";

import { cache } from "react";
import type { ConstructionStatus, Prisma } from "@prisma/client";

import { prisma } from "./db";
import type { Locale } from "./i18n/config";

export const projectCardSelect = {
  id: true,
  slugAr: true,
  slugEn: true,
  nameAr: true,
  nameEn: true,
  summaryAr: true,
  summaryEn: true,
  cityAr: true,
  cityEn: true,
  neighborhoodAr: true,
  neighborhoodEn: true,
  constructionStatus: true,
  salesStatus: true,
  featured: true,
  priceMin: true,
  priceMax: true,
  areaMin: true,
  areaMax: true,
  bedroomsMin: true,
  bedroomsMax: true,
  coverImage: { select: { url: true, altAr: true, altEn: true } },
  propertyType: { select: { key: true, nameAr: true, nameEn: true } },
} satisfies Prisma.ProjectSelect;

export type ProjectCardData = Prisma.ProjectGetPayload<{ select: typeof projectCardSelect }>;

export const getPropertyTypes = cache(() =>
  prisma.propertyType.findMany({ where: { active: true }, orderBy: [{ order: "asc" }, { nameAr: "asc" }] }),
);

export async function getHomeProjects() {
  const [featured, current, completed] = await Promise.all([
    prisma.project.findMany({
      where: { status: "PUBLISHED", featured: true },
      orderBy: [{ displayOrder: "asc" }, { publishedAt: "desc" }],
      take: 6,
      select: projectCardSelect,
    }),
    prisma.project.findMany({
      where: { status: "PUBLISHED", constructionStatus: { in: ["UPCOMING", "UNDER_CONSTRUCTION"] } },
      orderBy: [{ displayOrder: "asc" }, { publishedAt: "desc" }],
      take: 10,
      select: projectCardSelect,
    }),
    prisma.project.findMany({
      where: { status: "PUBLISHED", constructionStatus: "COMPLETED" },
      orderBy: [{ displayOrder: "asc" }, { publishedAt: "desc" }],
      take: 6,
      select: projectCardSelect,
    }),
  ]);
  const hero = await prisma.project.findMany({
    where: { status: "PUBLISHED", showOnHome: true },
    orderBy: [{ displayOrder: "asc" }, { publishedAt: "desc" }],
    take: 5,
    select: projectCardSelect,
  });
  return { hero, featured, current, completed };
}

export type ProjectFilters = {
  type?: string;
  location?: string;
  maxPrice?: number;
  bedrooms?: number;
  status?: ConstructionStatus;
};

export async function searchProjects(filters: ProjectFilters, page: number, pageSize = 12) {
  const and: Prisma.ProjectWhereInput[] = [{ status: "PUBLISHED" }];
  if (filters.type) and.push({ propertyType: { key: filters.type } });
  if (filters.status) and.push({ constructionStatus: filters.status });
  if (filters.location) {
    const q = filters.location.trim();
    and.push({
      OR: [
        { cityAr: { contains: q, mode: "insensitive" } },
        { cityEn: { contains: q, mode: "insensitive" } },
        { neighborhoodAr: { contains: q, mode: "insensitive" } },
        { neighborhoodEn: { contains: q, mode: "insensitive" } },
        { nameAr: { contains: q, mode: "insensitive" } },
        { nameEn: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  // Price/bedroom filters use the published ranges; projects without that data are not claimed to match.
  if (filters.maxPrice) and.push({ priceMin: { lte: filters.maxPrice } });
  if (filters.bedrooms) and.push({ bedroomsMax: { gte: filters.bedrooms } });

  const where = { AND: and };
  const [total, items] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: [{ featured: "desc" }, { displayOrder: "asc" }, { publishedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: projectCardSelect,
    }),
  ]);
  return { total, items, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export const getProjectBySlug = cache(async (locale: Locale, slug: string) => {
  const where: Prisma.ProjectWhereInput = locale === "ar" ? { slugAr: slug } : { slugEn: slug };
  return prisma.project.findFirst({
    where: { ...where, status: "PUBLISHED" },
    include: {
      coverImage: true,
      ogImage: true,
      propertyType: true,
      images: { orderBy: { order: "asc" }, include: { media: true } },
      features: { orderBy: [{ kind: "asc" }, { order: "asc" }] },
      nearby: { orderBy: { order: "asc" } },
      units: {
        where: { status: { not: "UNPUBLISHED" } },
        orderBy: [{ order: "asc" }, { reference: "asc" }],
        include: { propertyType: true, floorPlan: { select: { url: true, mimeType: true } } },
      },
    },
  });
});

export async function getRelatedProjects(projectId: string, typeId: string | null) {
  return prisma.project.findMany({
    where: { status: "PUBLISHED", id: { not: projectId }, ...(typeId ? { propertyTypeId: typeId } : {}) },
    orderBy: [{ featured: "desc" }, { displayOrder: "asc" }],
    take: 3,
    select: projectCardSelect,
  });
}

export const articleCardSelect = {
  id: true,
  slugAr: true,
  slugEn: true,
  titleAr: true,
  titleEn: true,
  excerptAr: true,
  excerptEn: true,
  publishedAt: true,
  coverImage: { select: { url: true, altAr: true, altEn: true } },
} satisfies Prisma.ArticleSelect;

export type ArticleCardData = Prisma.ArticleGetPayload<{ select: typeof articleCardSelect }>;

export async function listArticles(page: number, pageSize = 9) {
  const where: Prisma.ArticleWhereInput = { status: "PUBLISHED", publishedAt: { lte: new Date() } };
  const [total, items] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: articleCardSelect,
    }),
  ]);
  return { total, items, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export const getArticleBySlug = cache(async (locale: Locale, slug: string) =>
  prisma.article.findFirst({
    where: { ...(locale === "ar" ? { slugAr: slug } : { slugEn: slug }), status: "PUBLISHED", publishedAt: { lte: new Date() } },
    include: { coverImage: true },
  }),
);

export async function findRedirect(path: string) {
  return prisma.redirect.findUnique({ where: { fromPath: path } });
}

export const getStats = cache(() =>
  prisma.companyStat.findMany({ where: { enabled: true }, orderBy: { order: "asc" } }),
);
export const getAdvantages = cache(() =>
  prisma.advantage.findMany({ where: { enabled: true }, orderBy: { order: "asc" } }),
);

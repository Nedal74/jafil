import { prisma } from "../db";
import type { MatchProject } from "./match";

/** Read-only, published-only view of inventory for the assistant. No customer data is reachable from here. */
export async function loadPublishedInventory(): Promise<MatchProject[]> {
  const projects = await prisma.project.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      slugAr: true,
      slugEn: true,
      nameAr: true,
      nameEn: true,
      cityAr: true,
      cityEn: true,
      neighborhoodAr: true,
      neighborhoodEn: true,
      salesStatus: true,
      constructionStatus: true,
      featured: true,
      priceMin: true,
      priceMax: true,
      areaMin: true,
      areaMax: true,
      bedroomsMin: true,
      bedroomsMax: true,
      propertyType: { select: { key: true } },
      units: {
        where: { status: { not: "UNPUBLISHED" } },
        select: {
          id: true,
          reference: true,
          status: true,
          price: true,
          area: true,
          bedrooms: true,
          propertyType: { select: { key: true } },
        },
      },
    },
  });
  return projects.map(({ propertyType, units, ...p }) => ({
    ...p,
    typeKey: propertyType?.key ?? null,
    units: units.map(({ propertyType: ut, ...u }) => ({ ...u, typeKey: ut?.key ?? null })),
  }));
}

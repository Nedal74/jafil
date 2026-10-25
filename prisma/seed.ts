/**
 * Seeds structural configuration only: property types and homepage section
 * slots. No projects, units, articles, statistics or other business data are
 * created — those are entered by staff in the dashboard.
 */
import { PrismaClient } from "@prisma/client";

import { HOME_SECTION_KEYS } from "../src/lib/home-sections";

const prisma = new PrismaClient();

const TYPES = [
  { key: "apartment", nameAr: "شقق", nameEn: "Apartments" },
  { key: "floor", nameAr: "أدوار", nameEn: "Floors" },
  { key: "villa", nameAr: "فلل", nameEn: "Villas" },
  { key: "townhouse", nameAr: "تاون هاوس", nameEn: "Townhouses" },
];

async function main() {
  for (const [order, t] of TYPES.entries()) {
    await prisma.propertyType.upsert({ where: { key: t.key }, create: { ...t, order }, update: {} });
  }
  for (const [order, key] of HOME_SECTION_KEYS.entries()) {
    await prisma.homeSection.upsert({ where: { key }, create: { key, order }, update: {} });
  }
  console.log(`Seeded ${TYPES.length} property types and ${HOME_SECTION_KEYS.length} homepage sections.`);
}

main().finally(() => prisma.$disconnect());

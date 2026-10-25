import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/lib/auth/password";

const prisma = new PrismaClient();
async function main() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  await prisma.propertyType.createMany({
    data: [
      { key: "apartment", nameAr: "شقق", nameEn: "Apartments", order: 0 },
      { key: "floor", nameAr: "أدوار", nameEn: "Floors", order: 1 },
      { key: "villa", nameAr: "فلل", nameEn: "Villas", order: 2 },
    ],
  });
  const pw = await hashPassword("E2eTestPass123");
  await prisma.user.createMany({
    data: [
      { email: "super@e2e.test", name: "Super", role: "SUPER_ADMIN", passwordHash: pw },
      { email: "sales@e2e.test", name: "Sales", role: "SALES_AGENT", passwordHash: pw },
      { email: "editor@e2e.test", name: "Editor", role: "CONTENT_EDITOR", passwordHash: pw },
    ],
  });
}
main().finally(() => prisma.$disconnect());

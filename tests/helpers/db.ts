import { prisma } from "@/lib/db";

/** Truncates every application table. Only ever runs against the test database. */
export async function resetDb() {
  if (!/test/.test(process.env.DATABASE_URL ?? "")) throw new Error("refusing to reset a non-test database");
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

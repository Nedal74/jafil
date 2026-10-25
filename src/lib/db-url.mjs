/**
 * Resolves the database connection strings.
 *
 * DATABASE_URL / DIRECT_URL win when set. Otherwise the variables injected by
 * Vercel's Supabase (or Neon/Prisma Postgres) storage integration are used:
 *   POSTGRES_PRISMA_URL      → pooled runtime connection
 *   POSTGRES_URL_NON_POOLING → direct connection for migrations
 * Pooled URLs get pgbouncer=true&connection_limit=1 so Prisma works through
 * transaction-mode poolers on serverless.
 */
export function withPoolParams(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true");
    if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "1");
    return u.toString();
  } catch {
    return url;
  }
}

export function resolveDatabaseUrl(env = process.env) {
  return env.DATABASE_URL || withPoolParams(env.POSTGRES_PRISMA_URL) || undefined;
}

export function resolveDirectUrl(env = process.env) {
  return env.DIRECT_URL || env.POSTGRES_URL_NON_POOLING || undefined;
}

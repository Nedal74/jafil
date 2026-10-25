import { createHash } from "node:crypto";
import { prisma } from "./db";

/**
 * Fixed-window rate limiter persisted in Postgres so it holds across
 * instances and serverless invocations. Keys are hashed so raw IPs are not stored.
 */
export async function rateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; remaining: number }> {
  const key = `${bucket}:${createHash("sha256").update(identifier).digest("hex").slice(0, 32)}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  const row = await prisma.$transaction(async (tx) => {
    const existing = await tx.rateLimit.findUnique({ where: { key } });
    if (!existing || existing.windowStart < windowStart) {
      return tx.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, windowStart: now },
        update: { count: 1, windowStart: now },
      });
    }
    return tx.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  });

  return { ok: row.count <= limit, remaining: Math.max(0, limit - row.count) };
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

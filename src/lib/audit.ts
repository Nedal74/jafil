import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export async function audit(entry: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        summary: entry.summary.slice(0, 500),
        metadata: entry.metadata,
      },
    });
  } catch (err) {
    // Auditing must never break the primary operation; surface it in logs.
    console.error("[audit] failed to write entry", entry.action, entry.entity, (err as Error).message);
  }
}

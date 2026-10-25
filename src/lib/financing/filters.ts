import type { FinancingStatus, Prisma } from "@prisma/client";
import { toLatinDigits } from "../phone";

const STATUSES = ["NEW", "IN_REVIEW", "CONTACTED", "DOCUMENTS_REQUESTED", "REFERRED_TO_BANK", "CLOSED"];

export function financingWhere(f: { q?: string; status?: string; assignee?: string; from?: string; to?: string }): Prisma.FinancingApplicationWhereInput {
  const and: Prisma.FinancingApplicationWhereInput[] = [];
  if (f.q) {
    const q = toLatinDigits(f.q.trim()).slice(0, 80);
    const digits = q.replace(/\D/g, "");
    and.push({
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { reference: { contains: q.toUpperCase() } },
        ...(digits.length >= 4 ? [{ phoneNormalized: { contains: digits.replace(/^0/, "") } }] : []),
      ],
    });
  }
  if (f.status && STATUSES.includes(f.status)) and.push({ status: f.status as FinancingStatus });
  if (f.assignee === "none") and.push({ assignedToId: null });
  else if (f.assignee) and.push({ assignedToId: f.assignee });
  const from = f.from && !Number.isNaN(Date.parse(f.from)) ? new Date(f.from) : null;
  const to = f.to && !Number.isNaN(Date.parse(f.to)) ? new Date(new Date(f.to).getTime() + 86_400_000) : null;
  if (from || to) and.push({ createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } });
  return { AND: and };
}

import type { LeadSource, LeadStatus, Prisma } from "@prisma/client";

import { can } from "../auth/permissions";
import type { SessionUser } from "../auth/session";
import { toLatinDigits } from "../phone";

/** Agents without leads.view_all only see leads assigned to them or not yet assigned. */
export function leadScope(user: SessionUser): Prisma.LeadWhereInput {
  if (can(user.role, "leads.view_all")) return {};
  return { OR: [{ assignedToId: user.id }, { assignedToId: null }] };
}

export type LeadFilters = {
  q?: string;
  status?: string;
  source?: string;
  project?: string;
  assignee?: string;
  from?: string;
  to?: string;
};

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "VISIT_SCHEDULED", "NEGOTIATION", "WON", "LOST"];
const SOURCES = ["PROJECT_INQUIRY", "CONTACT_FORM", "AI_ASSISTANT", "FINANCING", "HOME_SEARCH", "MANUAL"];

export function leadWhere(user: SessionUser, f: LeadFilters): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [leadScope(user)];
  if (f.q) {
    const q = toLatinDigits(f.q.trim()).slice(0, 80);
    const digits = q.replace(/\D/g, "");
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        ...(digits.length >= 4 ? [{ phoneNormalized: { contains: digits.replace(/^0/, "") } }] : []),
      ],
    });
  }
  if (f.status && STATUSES.includes(f.status)) and.push({ status: f.status as LeadStatus });
  if (f.source && SOURCES.includes(f.source)) and.push({ source: f.source as LeadSource });
  if (f.project) and.push({ projectId: f.project });
  if (f.assignee === "none") and.push({ assignedToId: null });
  else if (f.assignee) and.push({ assignedToId: f.assignee });
  const from = f.from && !Number.isNaN(Date.parse(f.from)) ? new Date(f.from) : null;
  const to = f.to && !Number.isNaN(Date.parse(f.to)) ? new Date(new Date(f.to).getTime() + 86_400_000) : null;
  if (from || to) and.push({ createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } });
  return { AND: and };
}

/** Neutralises spreadsheet formula injection and quotes a CSV cell. */
export function csvCell(v: unknown): string {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows: unknown[][]): string {
  // BOM so Excel opens UTF-8 Arabic correctly.
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

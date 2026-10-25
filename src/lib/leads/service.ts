import type { Lead, LeadSource, Prisma } from "@prisma/client";

import { prisma } from "../db";
import { normalizeSaudiMobile } from "../phone";
import { notifyTeam } from "../notify";
import type { PublicLeadInput } from "./schema";

/**
 * Duplicate detection: flags (never merges) a lead whose normalized phone, or
 * email, matches an existing lead. The most recent match is referenced so an
 * agent can review both records and decide.
 */
export async function findPossibleDuplicate(phoneNormalized: string, email?: string | null): Promise<Lead | null> {
  const or: Prisma.LeadWhereInput[] = [{ phoneNormalized }];
  if (email) or.push({ email: { equals: email, mode: "insensitive" } });
  return prisma.lead.findFirst({ where: { OR: or }, orderBy: { createdAt: "desc" } });
}

export async function createLead(
  input: Omit<PublicLeadInput, "source" | "website" | "consent"> & { source: LeadSource; consent: boolean },
  opts: { actorId?: string; chatConversationId?: string } = {},
): Promise<Lead> {
  const phoneNormalized = normalizeSaudiMobile(input.phone);
  if (!phoneNormalized) throw new Error("invalid phone");

  // Only link to published inventory for public submissions.
  let projectId: string | null = null;
  let unitId: string | null = null;
  if (input.projectId) {
    const p = await prisma.project.findFirst({ where: { id: input.projectId, status: "PUBLISHED" }, select: { id: true } });
    projectId = p?.id ?? null;
  }
  if (input.unitId && projectId) {
    const u = await prisma.unit.findFirst({
      where: { id: input.unitId, projectId, status: { not: "UNPUBLISHED" } },
      select: { id: true },
    });
    unitId = u?.id ?? null;
  }

  const email = input.email ? input.email.toLowerCase() : null;
  const duplicate = await findPossibleDuplicate(phoneNormalized, email);

  const lead = await prisma.lead.create({
    data: {
      name: input.name,
      phone: input.phone,
      phoneNormalized,
      email,
      message: input.message || null,
      propertyTypeKey: input.propertyTypeKey || null,
      preferredLocation: input.preferredLocation || null,
      budgetMin: input.budgetMin ?? null,
      budgetMax: input.budgetMax ?? null,
      bedrooms: input.bedrooms ?? null,
      projectId,
      unitId,
      source: input.source,
      landingPage: input.landingPage?.slice(0, 300) || null,
      locale: input.locale ?? "ar",
      consent: input.consent,
      consentAt: input.consent ? new Date() : null,
      possibleDuplicateOfId: duplicate?.id ?? null,
      activities: {
        create: [
          { type: "created", toValue: input.source, actorId: opts.actorId ?? null },
          ...(duplicate ? [{ type: "duplicate_flagged", toValue: duplicate.id }] : []),
        ],
      },
    },
    include: { project: { select: { nameAr: true } } },
  });

  if (opts.chatConversationId) {
    await prisma.chatConversation.update({
      where: { id: opts.chatConversationId },
      data: { leadId: lead.id, handoffRequested: true },
    });
  }

  await notifyTeam({
    type: "lead.created",
    id: lead.id,
    source: lead.source,
    projectName: lead.project?.nameAr,
    duplicate: Boolean(duplicate),
  });
  return lead;
}

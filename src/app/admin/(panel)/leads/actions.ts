"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { fail, fdObject, guarded, ok, zf } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { can } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { leadScope } from "@/lib/leads/scope";
import { createLead } from "@/lib/leads/service";
import { normalizeSaudiMobile } from "@/lib/phone";

async function loadScoped(user: SessionUser, id: string) {
  return prisma.lead.findFirst({ where: { AND: [{ id }, leadScope(user)] } });
}

export const updateLeadStatus = guarded("leads.manage", async (user, _prev: unknown, fd: FormData) => {
  const id = z.string().parse(fd.get("id"));
  const status = z.enum(["NEW", "CONTACTED", "QUALIFIED", "VISIT_SCHEDULED", "NEGOTIATION", "WON", "LOST"]).parse(fd.get("status"));
  const lead = await loadScoped(user, id);
  if (!lead) return fail("العميل غير موجود أو خارج صلاحياتك");
  if (lead.status === status) return ok("لا تغيير");
  await prisma.$transaction([
    prisma.lead.update({ where: { id }, data: { status } }),
    prisma.leadActivity.create({ data: { leadId: id, actorId: user.id, type: "status", fromValue: lead.status, toValue: status } }),
  ]);
  await audit({ userId: user.id, action: "status", entity: "lead", entityId: id, summary: `تغيير حالة العميل ${lead.name}`, metadata: { from: lead.status, to: status } });
  revalidatePath(`/admin/leads/${id}`);
  return ok("تم تحديث الحالة");
});

export const assignLead = guarded("leads.view", async (user, _prev: unknown, fd: FormData) => {
  const id = z.string().parse(fd.get("id"));
  const assigneeId = (fd.get("assigneeId") as string) || null;
  const lead = await loadScoped(user, id);
  if (!lead) return fail("العميل غير موجود أو خارج صلاحياتك");
  // Agents may only claim unassigned leads for themselves; reassignment needs leads.assign.
  const selfClaim = assigneeId === user.id && !lead.assignedToId;
  if (!selfClaim && !can(user.role, "leads.assign")) return fail("ليست لديك صلاحية إسناد العملاء");
  if (assigneeId) {
    const assignee = await prisma.user.findFirst({ where: { id: assigneeId, active: true } });
    if (!assignee || !can(assignee.role, "leads.manage")) return fail("المستخدم المختار لا يملك صلاحية إدارة العملاء");
  }
  await prisma.$transaction([
    prisma.lead.update({ where: { id }, data: { assignedToId: assigneeId } }),
    prisma.leadActivity.create({ data: { leadId: id, actorId: user.id, type: "assign", fromValue: lead.assignedToId, toValue: assigneeId } }),
  ]);
  await audit({ userId: user.id, action: "assign", entity: "lead", entityId: id, summary: `إسناد العميل ${lead.name}` });
  revalidatePath(`/admin/leads/${id}`);
  return ok("تم الإسناد");
});

export const addLeadNote = guarded("leads.manage", async (user, _prev: unknown, fd: FormData) => {
  const id = z.string().parse(fd.get("id"));
  const body = zf.required(4000, "اكتب الملاحظة").parse(fd.get("body"));
  const lead = await loadScoped(user, id);
  if (!lead) return fail("العميل غير موجود أو خارج صلاحياتك");
  await prisma.$transaction([
    prisma.leadNote.create({ data: { leadId: id, authorId: user.id, body } }),
    prisma.leadActivity.create({ data: { leadId: id, actorId: user.id, type: "note" } }),
  ]);
  revalidatePath(`/admin/leads/${id}`);
  return ok("تمت إضافة الملاحظة");
});

export const createManualLead = guarded("leads.manage", async (user, _prev: unknown, fd: FormData) => {
  const d = z
    .object({
      name: zf.required(120),
      phone: z.string().trim().refine((v) => normalizeSaudiMobile(v) !== null, "رقم جوال سعودي غير صحيح"),
      email: z.union([z.literal(""), z.email("بريد غير صحيح")]).optional(),
      projectId: zf.optText(40),
      propertyTypeKey: zf.optText(60),
      preferredLocation: zf.optText(120),
      budgetMax: zf.optInt(0),
      bedrooms: zf.optInt(0, 20),
      message: zf.optText(2000),
      consent: zf.bool().refine((v) => v, "يجب تأكيد موافقة العميل على التواصل"),
    })
    .parse(fdObject(fd));
  const lead = await createLead(
    {
      ...d,
      email: d.email || undefined,
      projectId: d.projectId ?? undefined,
      propertyTypeKey: d.propertyTypeKey ?? undefined,
      preferredLocation: d.preferredLocation ?? undefined,
      budgetMax: d.budgetMax ?? undefined,
      bedrooms: d.bedrooms ?? undefined,
      message: d.message ?? undefined,
      source: "MANUAL",
      locale: "ar",
    },
    { actorId: user.id },
  );
  if (!can(user.role, "leads.view_all")) await prisma.lead.update({ where: { id: lead.id }, data: { assignedToId: user.id } });
  await audit({ userId: user.id, action: "create", entity: "lead", entityId: lead.id, summary: `إضافة عميل يدوياً ${lead.name}` });
  redirect(`/admin/leads/${lead.id}`);
});

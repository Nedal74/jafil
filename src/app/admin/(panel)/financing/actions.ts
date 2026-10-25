"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, guarded, ok, zf } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";

export const updateFinancing = guarded("financing.manage", async (user, _prev: unknown, fd: FormData) => {
  const id = z.string().parse(fd.get("id"));
  const status = z.enum(["NEW", "IN_REVIEW", "CONTACTED", "DOCUMENTS_REQUESTED", "REFERRED_TO_BANK", "CLOSED"]).parse(fd.get("status"));
  const assignedToId = (fd.get("assignedToId") as string) || null;
  const app = await prisma.financingApplication.findUnique({ where: { id } });
  if (!app) return fail("الطلب غير موجود");
  if (assignedToId) {
    const u = await prisma.user.findFirst({ where: { id: assignedToId, active: true } });
    if (!u || !can(u.role, "financing.manage")) return fail("المستخدم لا يملك صلاحية إدارة التمويل");
  }
  await prisma.financingApplication.update({ where: { id }, data: { status, assignedToId } });
  await audit({
    userId: user.id,
    action: "update",
    entity: "financing",
    entityId: id,
    summary: `تحديث طلب التمويل ${app.reference}`,
    metadata: { from: { status: app.status, assignedToId: app.assignedToId }, to: { status, assignedToId } },
  });
  revalidatePath(`/admin/financing/${id}`);
  return ok();
});

export const addFinancingNote = guarded("financing.manage", async (user, _prev: unknown, fd: FormData) => {
  const id = z.string().parse(fd.get("id"));
  const body = zf.required(4000, "اكتب الملاحظة").parse(fd.get("body"));
  await prisma.financingNote.create({ data: { applicationId: id, authorId: user.id, body } });
  revalidatePath(`/admin/financing/${id}`);
  return ok("تمت إضافة الملاحظة");
});

export const deleteFinancing = guarded("financing.manage", async (user, fd: FormData) => {
  const id = z.string().parse(fd.get("id"));
  const app = await prisma.financingApplication.delete({ where: { id } });
  await audit({ userId: user.id, action: "delete", entity: "financing", entityId: id, summary: `حذف طلب التمويل ${app.reference} (طلب حذف بيانات)` });
  revalidatePath("/admin/financing");
  return ok("تم حذف الطلب");
});

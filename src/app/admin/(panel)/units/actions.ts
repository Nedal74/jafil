"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, fdObject, guarded, ok, zf } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { syncProjectRanges } from "@/lib/projects/sync";

const unitSchema = z.object({
  projectId: z.string().min(1),
  reference: zf.required(40, "رقم الوحدة مطلوب"),
  propertyTypeId: zf.optText(40),
  area: zf.optFloat(1, 100000),
  price: zf.optInt(0),
  bedrooms: zf.optInt(0, 50),
  bathrooms: zf.optInt(0, 50),
  floorAr: zf.optText(60),
  floorEn: zf.optText(60),
  featuresAr: zf.optText(1000),
  featuresEn: zf.optText(1000),
  status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "UNPUBLISHED"]),
  floorPlanId: zf.optText(40),
  order: zf.int(0, 100000),
});

export const saveUnit = guarded("units.manage", async (user, _prev: unknown, fd: FormData) => {
  const id = (fd.get("id") as string) || null;
  const d = unitSchema.parse(fdObject(fd));
  if (id) {
    const before = await prisma.unit.findUnique({ where: { id }, select: { status: true, price: true, projectId: true } });
    if (!before || before.projectId !== d.projectId) return fail("الوحدة غير موجودة");
    await prisma.unit.update({ where: { id }, data: d });
    await audit({
      userId: user.id,
      action: "update",
      entity: "unit",
      entityId: id,
      summary: `تعديل الوحدة ${d.reference}`,
      metadata: { from: { status: before.status, price: before.price }, to: { status: d.status, price: d.price } },
    });
  } else {
    const u = await prisma.unit.create({ data: d });
    await audit({ userId: user.id, action: "create", entity: "unit", entityId: u.id, summary: `إضافة الوحدة ${d.reference}` });
  }
  await syncProjectRanges(d.projectId);
  revalidatePath("/", "layout");
  return ok(id ? "تم حفظ الوحدة" : "تمت إضافة الوحدة");
});

export const bulkUnitStatus = guarded("units.manage", async (user, _prev: unknown, fd: FormData) => {
  const projectId = z.string().parse(fd.get("projectId"));
  const status = z.enum(["AVAILABLE", "RESERVED", "SOLD", "UNPUBLISHED"], { error: "اختر الحالة" }).parse(fd.get("bulkStatus"));
  const ids = z.array(z.string()).min(1, "اختر وحدة واحدة على الأقل").max(500).parse(fd.getAll("unitIds"));
  const res = await prisma.unit.updateMany({ where: { id: { in: ids }, projectId }, data: { status } });
  await audit({ userId: user.id, action: "bulk_status", entity: "unit", entityId: projectId, summary: `تغيير حالة ${res.count} وحدة إلى ${status}` });
  await syncProjectRanges(projectId);
  revalidatePath("/", "layout");
  return ok(`تم تحديث ${res.count} وحدة`);
});

export const deleteUnit = guarded("units.manage", async (user, fd: FormData) => {
  const id = z.string().parse(fd.get("id"));
  const u = await prisma.unit.findUnique({ where: { id }, include: { _count: { select: { leads: true } } } });
  if (!u) return fail("الوحدة غير موجودة");
  if (u._count.leads) return fail("الوحدة مرتبطة بعملاء؛ غيّر حالتها إلى غير منشورة بدلاً من الحذف");
  await prisma.unit.delete({ where: { id } });
  await audit({ userId: user.id, action: "delete", entity: "unit", entityId: id, summary: `حذف الوحدة ${u.reference}` });
  await syncProjectRanges(u.projectId);
  revalidatePath("/", "layout");
  return ok();
});

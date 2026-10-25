"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, fdObject, guarded, ok, zf } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";

const schema = z.object({
  key: z.preprocess((v) => String(v ?? "").trim().toLowerCase(), z.string().regex(/^[a-z][a-z0-9-]{1,39}$/, "مفتاح لاتيني صغير بلا مسافات، مثل villa")),
  nameAr: zf.required(60),
  nameEn: zf.required(60),
  order: zf.int(0, 1000),
  active: zf.bool(),
});

export const savePropertyType = guarded("projects.manage", async (user, _prev: unknown, fd: FormData) => {
  const id = (fd.get("id") as string) || null;
  const d = schema.parse(fdObject(fd));
  if (id) await prisma.propertyType.update({ where: { id }, data: d });
  else await prisma.propertyType.create({ data: d });
  await audit({ userId: user.id, action: id ? "update" : "create", entity: "property_type", entityId: id, summary: d.nameAr });
  revalidatePath("/", "layout");
  return ok();
});

export const deletePropertyType = guarded("projects.manage", async (user, fd: FormData) => {
  const id = z.string().parse(fd.get("id"));
  const t = await prisma.propertyType.findUnique({ where: { id }, include: { _count: { select: { projects: true, units: true } } } });
  if (!t) return fail("غير موجود");
  if (t._count.projects || t._count.units) return fail("النوع مستخدم في مشاريع أو وحدات؛ عطّله بدلاً من حذفه");
  await prisma.propertyType.delete({ where: { id } });
  await audit({ userId: user.id, action: "delete", entity: "property_type", entityId: id, summary: t.nameAr });
  revalidatePath("/", "layout");
  return ok();
});

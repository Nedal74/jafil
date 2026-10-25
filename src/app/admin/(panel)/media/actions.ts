"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, guarded, ok, zf } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

export const updateMediaAlt = guarded("media.manage", async (_user, _prev: unknown, fd: FormData) => {
  const d = z.object({ id: z.string(), altAr: zf.optText(200), altEn: zf.optText(200) }).parse({ id: fd.get("id"), altAr: fd.get("altAr"), altEn: fd.get("altEn") });
  await prisma.media.update({ where: { id: d.id }, data: { altAr: d.altAr, altEn: d.altEn } });
  revalidatePath("/", "layout");
  return ok();
});

export const deleteMedia = guarded("media.manage", async (user, fd: FormData) => {
  const id = z.string().parse(fd.get("id"));
  const m = await prisma.media.findUnique({
    where: { id },
    include: { _count: { select: { projectCovers: true, projectImages: true, articleCovers: true, unitFloorPlans: true, projectOgImages: true, unitImages: true } } },
  });
  if (!m) return fail("الملف غير موجود");
  const uses = Object.values(m._count).reduce((a, b) => a + b, 0);
  if (uses > 0) return fail(`الملف مستخدم في ${uses} موضع؛ أزله منها أولاً`);
  const [{ n }] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM "Setting" WHERE value::text LIKE '%' || ${m.url} || '%'`;
  if (n > BigInt(0)) return fail("الملف مستخدم في إعدادات الموقع (مثل صورة الرئيس أو صورة المشاركة)");
  await prisma.media.delete({ where: { id } });
  await storage().remove(m.storageKey);
  await audit({ userId: user.id, action: "delete", entity: "media", entityId: id, summary: m.originalName });
  revalidatePath("/admin/media");
  return ok("تم الحذف");
});

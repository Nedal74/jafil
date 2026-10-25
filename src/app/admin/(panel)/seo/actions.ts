"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { guarded, ok } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";

const path = z
  .string()
  .trim()
  .max(300)
  .regex(/^\/[^\s]*$/, "يجب أن يبدأ المسار بـ / بدون مسافات");

export const saveRedirect = guarded("seo.manage", async (user, _prev: unknown, fd: FormData) => {
  const d = z
    .object({
      fromPath: path,
      toPath: z.string().trim().max(500).refine((v) => v.startsWith("/") || /^https:\/\//.test(v), "مسار داخلي أو رابط https"),
    })
    .refine((d) => d.fromPath !== d.toPath, { path: ["toPath"], message: "لا يمكن التحويل للمسار نفسه" })
    .parse({ fromPath: fd.get("fromPath"), toPath: fd.get("toPath") });
  await prisma.redirect.upsert({ where: { fromPath: d.fromPath }, create: d, update: { toPath: d.toPath } });
  await audit({ userId: user.id, action: "upsert", entity: "redirect", summary: `${d.fromPath} → ${d.toPath}` });
  revalidatePath("/admin/seo");
  return ok();
});

export const deleteRedirect = guarded("seo.manage", async (user, fd: FormData) => {
  const r = await prisma.redirect.delete({ where: { id: z.string().parse(fd.get("id")) } });
  await audit({ userId: user.id, action: "delete", entity: "redirect", summary: r.fromPath });
  revalidatePath("/admin/seo");
  return ok();
});

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, guarded, ok, zf } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { hashPassword, passwordPolicyError } from "@/lib/auth/password";
import { prisma } from "@/lib/db";

const ROLE = z.enum(["SUPER_ADMIN", "CONTENT_EDITOR", "SALES_AGENT", "FINANCING_MANAGER"]);

async function remainingSuperAdmins(excludeId: string) {
  return prisma.user.count({ where: { role: "SUPER_ADMIN", active: true, id: { not: excludeId } } });
}

export const createUser = guarded("users.manage", async (user, _prev: unknown, fd: FormData) => {
  const d = z
    .object({ name: zf.required(100), email: z.string().trim().toLowerCase().email("بريد غير صحيح"), role: ROLE, password: z.string() })
    .parse({ name: fd.get("name"), email: fd.get("email"), role: fd.get("role"), password: fd.get("password") });
  const pwErr = passwordPolicyError(d.password);
  if (pwErr) return fail(pwErr, { password: pwErr });
  const created = await prisma.user.create({ data: { name: d.name, email: d.email, role: d.role, passwordHash: await hashPassword(d.password) } });
  await audit({ userId: user.id, action: "create", entity: "user", entityId: created.id, summary: `إنشاء مستخدم ${d.email} (${d.role})` });
  revalidatePath("/admin/users");
  return ok("تم إنشاء المستخدم");
});

export const updateUser = guarded("users.manage", async (user, _prev: unknown, fd: FormData) => {
  const d = z
    .object({ id: z.string(), name: zf.required(100), role: ROLE, active: zf.bool(), password: z.string().optional() })
    .parse({ id: fd.get("id"), name: fd.get("name"), role: fd.get("role"), active: fd.get("active"), password: (fd.get("password") as string) || undefined });
  const target = await prisma.user.findUnique({ where: { id: d.id } });
  if (!target) return fail("المستخدم غير موجود");
  if (target.role === "SUPER_ADMIN" && (d.role !== "SUPER_ADMIN" || !d.active) && (await remainingSuperAdmins(d.id)) === 0) {
    return fail("لا يمكن إزالة آخر مدير نظام نشط");
  }
  let passwordHash: string | undefined;
  if (d.password) {
    const pwErr = passwordPolicyError(d.password);
    if (pwErr) return fail(pwErr, { password: pwErr });
    passwordHash = await hashPassword(d.password);
  }
  await prisma.user.update({ where: { id: d.id }, data: { name: d.name, role: d.role, active: d.active, ...(passwordHash ? { passwordHash } : {}) } });
  // Role/status/password changes invalidate existing sessions.
  if (passwordHash || !d.active || d.role !== target.role) await prisma.session.deleteMany({ where: { userId: d.id } });
  await audit({
    userId: user.id,
    action: "update",
    entity: "user",
    entityId: d.id,
    summary: `تعديل المستخدم ${target.email}`,
    metadata: { roleFrom: target.role, roleTo: d.role, active: d.active, passwordChanged: Boolean(passwordHash) },
  });
  revalidatePath("/admin/users");
  return ok();
});

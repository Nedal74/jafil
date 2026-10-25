"use server";

import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { hashPassword, passwordPolicyError } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { setupKeyRequired } from "@/lib/auth/setup";
import { clientIp, rateLimit } from "@/lib/rate-limit";

function keyMatches(given: string): boolean {
  const expected = process.env.SETUP_KEY ?? "";
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Creates the very first Super Admin from the browser. Only works while the
 * database has no users; in production it also requires SETUP_KEY (an env var
 * the owner sets in the hosting dashboard), so nobody else can claim the site.
 */
export async function createFirstAdmin(_prev: unknown, fd: FormData): Promise<{ error?: string }> {
  const limit = await rateLimit("setup", clientIp(await headers()), 10, 900);
  if (!limit.ok) return { error: "محاولات كثيرة. حاول بعد 15 دقيقة" };

  const parsed = z
    .object({
      name: z.string().trim().min(2, "أدخل الاسم").max(100),
      email: z.string().trim().toLowerCase().email("بريد غير صحيح"),
      password: z.string().max(200),
      setupKey: z.string().max(500).optional(),
    })
    .safeParse({ name: fd.get("name"), email: fd.get("email"), password: fd.get("password"), setupKey: fd.get("setupKey") ?? undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const d = parsed.data;

  if (setupKeyRequired() && !keyMatches(d.setupKey ?? "")) return { error: "مفتاح الإعداد غير صحيح" };
  const pwErr = passwordPolicyError(d.password);
  if (pwErr) return { error: pwErr };

  const passwordHash = await hashPassword(d.password);
  const user = await prisma.$transaction(async (tx) => {
    if ((await tx.user.count()) > 0) return null;
    return tx.user.create({ data: { name: d.name, email: d.email, role: "SUPER_ADMIN", passwordHash } });
  });
  if (!user) redirect("/admin/login");

  await audit({ userId: user.id, action: "setup", entity: "user", entityId: user.id, summary: `إنشاء أول مدير نظام ${d.email}` });
  await createSession(user.id);
  redirect("/admin");
}

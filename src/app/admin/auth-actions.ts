"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) });

// Equalises timing when the email doesn't exist.
const DUMMY_HASH = "scrypt:00000000000000000000000000000000:" + "0".repeat(128);

export async function loginAction(_prev: unknown, fd: FormData): Promise<{ error?: string }> {
  const parsed = schema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: "أدخل البريد الإلكتروني وكلمة المرور" };
  const { email, password } = parsed.data;

  const ip = clientIp(await headers());
  const [byIp, byEmail] = await Promise.all([rateLimit("login-ip", ip, 20, 900), rateLimit("login-email", email, 8, 900)]);
  if (!byIp.ok || !byEmail.ok) return { error: "محاولات كثيرة. حاول بعد 15 دقيقة" };

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || !user.active) {
    await audit({ userId: user?.id, action: "login_failed", entity: "auth", summary: `محاولة دخول فاشلة` });
    return { error: "بيانات الدخول غير صحيحة" };
  }

  await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ userId: user.id, action: "login", entity: "auth", summary: "تسجيل دخول" });
  redirect("/admin");
}

export async function logoutAction() {
  const user = await getSessionUser();
  await destroySession();
  if (user) await audit({ userId: user.id, action: "logout", entity: "auth", summary: "تسجيل خروج" });
  redirect("/admin/login");
}

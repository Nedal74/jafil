import "server-only";

import { z, ZodError } from "zod";
import { Prisma } from "@prisma/client";

import { AuthError, assertPermission, type SessionUser } from "../auth/session";
import type { Permission } from "../auth/permissions";

export type ActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Monotonic token so the client can tell two identical results apart. */
  at?: number;
};

export const ok = (message = "تم الحفظ بنجاح"): ActionResult => ({ ok: true, message, at: Date.now() });
export const fail = (message: string, fieldErrors?: Record<string, string>): ActionResult => ({
  ok: false,
  message,
  fieldErrors,
  at: Date.now(),
});

/**
 * Wraps a server action: enforces the permission server-side, and converts
 * validation/authorization/unique-constraint errors into a form result.
 * Next's redirect()/notFound() errors are re-thrown untouched.
 */
export function guarded<A extends unknown[]>(
  permission: Permission,
  fn: (user: SessionUser, ...args: A) => Promise<ActionResult>,
) {
  return async (...args: A): Promise<ActionResult> => {
    try {
      const user = await assertPermission(permission);
      return await fn(user, ...args);
    } catch (err) {
      if (err instanceof AuthError) return fail(err.status === 401 ? "انتهت الجلسة، سجّل الدخول مجدداً" : "ليست لديك صلاحية لهذا الإجراء");
      if (err instanceof ZodError) {
        const fe: Record<string, string> = {};
        for (const i of err.issues) {
          const k = i.path.join(".") || "form";
          if (!fe[k]) fe[k] = i.message;
        }
        return fail("يرجى تصحيح الحقول المظللة", fe);
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = (err.meta?.target as string[] | undefined)?.join("، ") ?? "";
        return fail(`القيمة مستخدمة مسبقاً (${target})`);
      }
      if (isNextControlFlow(err)) throw err;
      console.error("[admin action]", err);
      return fail("حدث خطأ غير متوقع. حاول مرة أخرى");
    }
  };
}

function isNextControlFlow(err: unknown): boolean {
  const digest = (err as { digest?: unknown })?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND") || digest.startsWith("NEXT_HTTP_ERROR"));
}

// ---------------------------------------------------------------------------
// FormData → typed values
// ---------------------------------------------------------------------------

export function fdObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  return out;
}

const blankToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const zf = {
  text: (max = 300) => z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().max(max, `الحد الأقصى ${max} حرف`)),
  required: (max = 300, msg = "هذا الحقل مطلوب") =>
    z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string({ error: msg }).min(1, msg).max(max, `الحد الأقصى ${max} حرف`)),
  optText: (max = 300) =>
    z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v), z.string().max(max, `الحد الأقصى ${max} حرف`).nullable().default(null)),
  optInt: (min = 0, max = 2_000_000_000) =>
    z.preprocess(
      (v) => (blankToUndef(v) === undefined ? null : Number(String(v).replace(/[,\s]/g, ""))),
      z.number({ error: "أدخل رقماً صحيحاً" }).int("أدخل رقماً صحيحاً").min(min, `الحد الأدنى ${min}`).max(max).nullable(),
    ),
  optFloat: (min = 0, max = 1_000_000) =>
    z.preprocess(
      (v) => (blankToUndef(v) === undefined ? null : Number(String(v).replace(/[,\s]/g, ""))),
      z.number({ error: "أدخل رقماً" }).min(min, `الحد الأدنى ${min}`).max(max).nullable(),
    ),
  int: (min = 0, max = 1_000_000) =>
    z.preprocess((v) => (blankToUndef(v) === undefined ? 0 : Number(v)), z.number({ error: "أدخل رقماً" }).int().min(min).max(max)),
  bool: () => z.preprocess((v) => v === "on" || v === "true" || v === "1", z.boolean()),
  url: () =>
    z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v),
      z
        .string()
        .max(500)
        .refine((s) => /^https?:\/\//i.test(s), "يجب أن يبدأ الرابط بـ https://")
        .nullable(),
    ),
  slug: () =>
    z.preprocess(
      (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
      z
        .string()
        .min(1, "الرابط المختصر مطلوب")
        .max(100)
        .regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u, "استخدم حروفاً وأرقاماً وشرطات فقط"),
    ),
};

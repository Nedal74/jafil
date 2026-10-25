import { NextResponse } from "next/server";

import { AuthError, assertPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isSameOrigin, jsonError } from "@/lib/http";
import { saveUpload, UploadError } from "@/lib/media";

export async function GET(req: Request) {
  try {
    await assertPermission("media.manage");
  } catch (e) {
    return jsonError(e instanceof AuthError ? e.status : 401, "forbidden");
  }
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const onlyImages = url.searchParams.get("type") !== "all";
  const where = onlyImages ? { mimeType: { startsWith: "image/" } } : {};
  const [total, items] = await Promise.all([
    prisma.media.count({ where }),
    prisma.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 24,
      take: 24,
      select: { id: true, url: true, mimeType: true, originalName: true, altAr: true },
    }),
  ]);
  return NextResponse.json({ ok: true, items, page, pages: Math.max(1, Math.ceil(total / 24)) });
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403, "forbidden");
  let user;
  try {
    user = await assertPermission("media.manage");
  } catch (e) {
    return jsonError(e instanceof AuthError ? e.status : 401, "forbidden");
  }
  const form = await req.formData().catch(() => null);
  const files = form?.getAll("file").filter((f): f is File => f instanceof File) ?? [];
  if (!files.length) return jsonError(400, "لم يتم اختيار ملف");
  if (files.length > 20) return jsonError(400, "الحد الأقصى 20 ملفاً في المرة");
  const created = [];
  for (const f of files) {
    try {
      const m = await saveUpload(f, user.id);
      created.push({ id: m.id, url: m.url, mimeType: m.mimeType, originalName: m.originalName });
    } catch (err) {
      if (err instanceof UploadError) return jsonError(422, err.message, { created });
      throw err;
    }
  }
  return NextResponse.json({ ok: true, items: created });
}

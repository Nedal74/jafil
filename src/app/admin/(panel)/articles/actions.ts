"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { fail, fdObject, guarded, ok, zf } from "@/lib/admin/action";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { recordSlugRedirects } from "@/lib/redirects";
import { slugify } from "@/lib/utils";

const schema = z.object({
  titleAr: zf.required(200),
  titleEn: zf.required(200),
  slugAr: zf.slug(),
  slugEn: zf.slug(),
  excerptAr: zf.optText(500),
  excerptEn: zf.optText(500),
  bodyAr: zf.optText(50000),
  bodyEn: zf.optText(50000),
  coverImageId: zf.optText(40),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  publishedAt: z.preprocess((v) => (v ? new Date(String(v)) : null), z.date({ error: "تاريخ غير صالح" }).nullable()),
  seoTitleAr: zf.optText(70),
  seoTitleEn: zf.optText(70),
  seoDescriptionAr: zf.optText(170),
  seoDescriptionEn: zf.optText(170),
});

export const saveArticle = guarded("articles.manage", async (user, _prev: unknown, fd: FormData) => {
  const id = (fd.get("id") as string) || null;
  const raw = fdObject(fd);
  if (!raw.slugAr?.trim() && raw.titleAr) raw.slugAr = slugify(raw.titleAr);
  if (!raw.slugEn?.trim() && raw.titleEn) raw.slugEn = slugify(raw.titleEn);
  const d = schema.parse(raw);
  const publishedAt = d.status === "PUBLISHED" ? d.publishedAt ?? new Date() : d.publishedAt;

  if (id) {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) return fail("المقال غير موجود");
    await prisma.article.update({ where: { id }, data: { ...d, publishedAt } });
    if (existing.status === "PUBLISHED") await recordSlugRedirects(existing, d, "news");
    await audit({ userId: user.id, action: "update", entity: "article", entityId: id, summary: d.titleAr });
    revalidatePath("/", "layout");
    return ok();
  }
  const a = await prisma.article.create({ data: { ...d, publishedAt } });
  await audit({ userId: user.id, action: "create", entity: "article", entityId: a.id, summary: d.titleAr });
  revalidatePath("/", "layout");
  redirect(`/admin/articles/${a.id}`);
});

export const deleteArticle = guarded("articles.manage", async (user, fd: FormData) => {
  const id = z.string().parse(fd.get("id"));
  const a = await prisma.article.delete({ where: { id } });
  await audit({ userId: user.id, action: "delete", entity: "article", entityId: id, summary: a.titleAr });
  revalidatePath("/", "layout");
  redirect("/admin/articles");
});

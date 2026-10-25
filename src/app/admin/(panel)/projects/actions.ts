"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { fail, fdObject, guarded, ok, zf } from "@/lib/admin/action";
import { syncProjectRanges } from "@/lib/projects/sync";
import { validateRange } from "@/lib/projects/inventory";
import { recordSlugRedirects } from "@/lib/redirects";
import { slugify } from "@/lib/utils";

const projectSchema = z
  .object({
    nameAr: zf.required(150),
    nameEn: zf.required(150),
    slugAr: zf.slug(),
    slugEn: zf.slug(),
    summaryAr: zf.optText(600),
    summaryEn: zf.optText(600),
    descriptionAr: zf.optText(10000),
    descriptionEn: zf.optText(10000),
    cityAr: zf.optText(80),
    cityEn: zf.optText(80),
    neighborhoodAr: zf.optText(80),
    neighborhoodEn: zf.optText(80),
    addressAr: zf.optText(200),
    addressEn: zf.optText(200),
    latitude: zf.optFloat(-90, 90),
    longitude: zf.optFloat(-180, 180),
    mapUrl: zf.url(),
    propertyTypeId: zf.optText(40),
    constructionStatus: z.enum(["UPCOMING", "UNDER_CONSTRUCTION", "COMPLETED"]),
    salesStatus: z.enum(["COMING_SOON", "AVAILABLE", "SOLD_OUT"]),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    featured: zf.bool(),
    showOnHome: zf.bool(),
    displayOrder: zf.int(0, 10000),
    coverImageId: zf.optText(40),
    videoUrl: zf.url(),
    rangeMode: z.enum(["AUTO_FROM_UNITS", "MANUAL"]),
    priceMin: zf.optInt(0),
    priceMax: zf.optInt(0),
    areaMin: zf.optFloat(0, 100000),
    areaMax: zf.optFloat(0, 100000),
    bedroomsMin: zf.optInt(0, 50),
    bedroomsMax: zf.optInt(0, 50),
    inventoryBasis: z.enum(["LISTED_UNITS", "MANUAL_TOTAL"]),
    manualInventoryTotal: zf.optInt(1, 100000),
    deliveryAr: zf.optText(200),
    deliveryEn: zf.optText(200),
    salesPhone: zf.optText(20),
    salesWhatsapp: zf.optText(20),
    seoTitleAr: zf.optText(70),
    seoTitleEn: zf.optText(70),
    seoDescriptionAr: zf.optText(170),
    seoDescriptionEn: zf.optText(170),
    canonicalUrl: zf.url(),
    ogImageId: zf.optText(40),
  })
  .superRefine((d, ctx) => {
    if (!validateRange(d.priceMin, d.priceMax)) ctx.addIssue({ code: "custom", path: ["priceMax"], message: "الحد الأعلى أقل من الأدنى" });
    if (!validateRange(d.areaMin, d.areaMax)) ctx.addIssue({ code: "custom", path: ["areaMax"], message: "الحد الأعلى أقل من الأدنى" });
    if (!validateRange(d.bedroomsMin, d.bedroomsMax)) ctx.addIssue({ code: "custom", path: ["bedroomsMax"], message: "الحد الأعلى أقل من الأدنى" });
    if (d.inventoryBasis === "MANUAL_TOTAL" && !d.manualInventoryTotal)
      ctx.addIssue({ code: "custom", path: ["manualInventoryTotal"], message: "أدخل إجمالي المخزون" });
    if ((d.latitude == null) !== (d.longitude == null))
      ctx.addIssue({ code: "custom", path: ["longitude"], message: "أدخل خط العرض والطول معاً" });
  });


export const saveProject = guarded("projects.manage", async (user, _prev: unknown, fd: FormData) => {
  const id = (fd.get("id") as string) || null;
  const raw = fdObject(fd);
  if (!raw.slugAr?.trim() && raw.nameAr) raw.slugAr = slugify(raw.nameAr);
  if (!raw.slugEn?.trim() && raw.nameEn) raw.slugEn = slugify(raw.nameEn);
  const data = projectSchema.parse(raw);

  // Ranges come from units in AUTO mode; never trust submitted values then.
  const { rangeMode, priceMin, priceMax, areaMin, areaMax, bedroomsMin, bedroomsMax, ...rest } = data;
  const ranges = rangeMode === "MANUAL" ? { priceMin, priceMax, areaMin, areaMax, bedroomsMin, bedroomsMax } : {};

  if (id) {
    const existing = await prisma.project.findUnique({ where: { id }, select: { slugAr: true, slugEn: true, status: true, publishedAt: true } });
    if (!existing) return fail("المشروع غير موجود");
    await prisma.project.update({
      where: { id },
      data: {
        ...rest,
        rangeMode,
        ...ranges,
        publishedAt: rest.status === "PUBLISHED" && !existing.publishedAt ? new Date() : existing.publishedAt,
      },
    });
    if (existing.status === "PUBLISHED") await recordSlugRedirects(existing, data, "projects");
    await syncProjectRanges(id);
    await audit({ userId: user.id, action: "update", entity: "project", entityId: id, summary: `تعديل مشروع ${data.nameAr}` });
    revalidatePath("/", "layout");
    return ok();
  }

  const created = await prisma.project.create({
    data: { ...rest, rangeMode, ...ranges, publishedAt: rest.status === "PUBLISHED" ? new Date() : null },
  });
  await audit({ userId: user.id, action: "create", entity: "project", entityId: created.id, summary: `إنشاء مشروع ${data.nameAr}` });
  revalidatePath("/", "layout");
  redirect(`/admin/projects/${created.id}?created=1`);
});

export const setProjectStatus = guarded("projects.manage", async (user, fd: FormData) => {
  const id = z.string().parse(fd.get("id"));
  const status = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).parse(fd.get("status"));
  const p = await prisma.project.update({
    where: { id },
    data: { status, ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}) },
  });
  await audit({ userId: user.id, action: `status:${status}`, entity: "project", entityId: id, summary: `تغيير حالة ${p.nameAr}` });
  revalidatePath("/", "layout");
  return ok();
});

export const deleteProject = guarded("projects.manage", async (user, fd: FormData) => {
  const id = z.string().parse(fd.get("id"));
  const p = await prisma.project.findUnique({ where: { id }, include: { _count: { select: { leads: true, units: true } } } });
  if (!p) return fail("المشروع غير موجود");
  if (p.status !== "ARCHIVED") return fail("أرشف المشروع أولاً قبل حذفه نهائياً");
  if (p._count.leads > 0) return fail("لا يمكن حذف مشروع مرتبط بعملاء محتملين؛ أبقه مؤرشفاً");
  await prisma.project.delete({ where: { id } });
  await audit({ userId: user.id, action: "delete", entity: "project", entityId: id, summary: `حذف مشروع ${p.nameAr} (${p._count.units} وحدة)` });
  revalidatePath("/", "layout");
  redirect("/admin/projects");
});

// --- Gallery -----------------------------------------------------------------

export const addGalleryImages = guarded("projects.manage", async (user, fd: FormData) => {
  const projectId = z.string().parse(fd.get("projectId"));
  const ids = z.array(z.string().max(40)).max(50).parse(String(fd.get("mediaIds") || "").split(",").filter(Boolean));
  const max = await prisma.projectImage.aggregate({ where: { projectId }, _max: { order: true } });
  let order = (max._max.order ?? 0) + 1;
  const media = await prisma.media.findMany({ where: { id: { in: ids }, mimeType: { startsWith: "image/" } }, select: { id: true } });
  await prisma.projectImage.createMany({ data: media.map((m) => ({ projectId, mediaId: m.id, order: order++ })) });
  await audit({ userId: user.id, action: "gallery_add", entity: "project", entityId: projectId, summary: `إضافة ${media.length} صورة للمعرض` });
  revalidatePath("/", "layout");
  return ok("تمت إضافة الصور");
});

export const updateGalleryImage = guarded("projects.manage", async (_user, _prev: unknown, fd: FormData) => {
  const d = z.object({ id: z.string(), order: zf.int(0, 10000), captionAr: zf.optText(200), captionEn: zf.optText(200) }).parse(fdObject(fd));
  await prisma.projectImage.update({ where: { id: d.id }, data: { order: d.order, captionAr: d.captionAr, captionEn: d.captionEn } });
  revalidatePath("/", "layout");
  return ok();
});

export const removeGalleryImage = guarded("projects.manage", async (_user, fd: FormData) => {
  await prisma.projectImage.delete({ where: { id: z.string().parse(fd.get("id")) } });
  revalidatePath("/", "layout");
  return ok();
});

// --- Features & nearby -------------------------------------------------------------

const featureSchema = z.object({
  projectId: z.string(),
  kind: z.enum(["AMENITY", "FACILITY", "GUARANTEE"]),
  labelAr: zf.required(120),
  labelEn: zf.required(120),
  detailAr: zf.optText(120),
  detailEn: zf.optText(120),
  order: zf.int(0, 1000),
});

export const saveFeature = guarded("projects.manage", async (user, _prev: unknown, fd: FormData) => {
  const id = (fd.get("id") as string) || null;
  const d = featureSchema.parse(fdObject(fd));
  if (id) await prisma.projectFeature.update({ where: { id }, data: d });
  else await prisma.projectFeature.create({ data: d });
  await audit({ userId: user.id, action: id ? "feature_update" : "feature_add", entity: "project", entityId: d.projectId, summary: d.labelAr });
  revalidatePath("/", "layout");
  return ok();
});

export const deleteFeature = guarded("projects.manage", async (_user, fd: FormData) => {
  await prisma.projectFeature.delete({ where: { id: z.string().parse(fd.get("id")) } });
  revalidatePath("/", "layout");
  return ok();
});

export const saveNearby = guarded("projects.manage", async (_user, _prev: unknown, fd: FormData) => {
  const id = (fd.get("id") as string) || null;
  const d = z
    .object({ projectId: z.string(), nameAr: zf.required(120), nameEn: zf.required(120), minutes: zf.optInt(0, 300), order: zf.int(0, 1000) })
    .parse(fdObject(fd));
  if (id) await prisma.nearbyPlace.update({ where: { id }, data: d });
  else await prisma.nearbyPlace.create({ data: d });
  revalidatePath("/", "layout");
  return ok();
});

export const deleteNearby = guarded("projects.manage", async (_user, fd: FormData) => {
  await prisma.nearbyPlace.delete({ where: { id: z.string().parse(fd.get("id")) } });
  revalidatePath("/", "layout");
  return ok();
});

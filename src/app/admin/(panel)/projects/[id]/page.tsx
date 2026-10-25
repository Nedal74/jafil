import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm, ConfirmAction, SelectField, SubmitButton, TextField } from "@/components/admin/forms";
import { Badge, PageHeader, Panel, StatCard } from "@/components/admin/ui";
import { FEATURE_LABELS, options, PUBLISH_LABELS, PUBLISH_TONE } from "@/lib/admin/labels";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { computeInventory, rangeWarnings } from "@/lib/projects/inventory";
import { getSetting } from "@/lib/settings";
import {
  addGalleryImages, deleteFeature, deleteNearby, deleteProject, removeGalleryImage, saveFeature, saveNearby, setProjectStatus, updateGalleryImage,
} from "../actions";
import { ProjectForm } from "../ProjectForm";
import { GalleryAdd } from "./GalleryAdd";

export const metadata = { title: "تعديل مشروع" };

export default async function EditProject({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireUser("projects.manage");
  const { id } = await params;
  const created = (await searchParams).created;
  const [project, types, inv] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        coverImage: true,
        ogImage: true,
        images: { orderBy: { order: "asc" }, include: { media: true } },
        features: { orderBy: [{ kind: "asc" }, { order: "asc" }] },
        nearby: { orderBy: { order: "asc" } },
        units: { select: { status: true, price: true, area: true, bedrooms: true } },
        _count: { select: { leads: true } },
      },
    }),
    prisma.propertyType.findMany({ orderBy: { order: "asc" } }),
    getSetting("inventory"),
  ]);
  if (!project) notFound();

  const stats = computeInventory(project.units, project.inventoryBasis, project.manualInventoryTotal, inv.countReservedAsSold);
  const warnings = rangeWarnings(project.rangeMode, project, project.units);
  const publicPath = `/ar/projects/${encodeURIComponent(project.slugAr)}`;

  return (
    <>
      <PageHeader
        title={project.nameAr}
        description={project.nameEn}
        actions={
          <>
            <Badge tone={PUBLISH_TONE[project.status]}>{PUBLISH_LABELS[project.status]}</Badge>
            {project.status === "PUBLISHED" && <Link href={publicPath} target="_blank" className="btn-outline px-3 py-1.5 text-xs">عرض في الموقع ↗</Link>}
            <Link href={`/admin/projects/${id}/units`} className="btn-primary px-3 py-1.5 text-xs">إدارة الوحدات</Link>
          </>
        }
      />
      {created && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">تم إنشاء المشروع. أكمل المعرض والخصائص والوحدات أدناه.</p>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="الوحدات المعروضة" value={formatNumber(stats.available + stats.reserved + stats.sold, "ar")} hint={`${stats.unpublished} غير منشورة`} />
        <StatCard label="متاحة" value={formatNumber(stats.available, "ar")} />
        <StatCard label="محجوزة" value={formatNumber(stats.reserved, "ar")} />
        <StatCard label="مباعة" value={formatNumber(stats.sold, "ar")} />
        <StatCard
          label="نسبة المبيعات"
          value={stats.soldPercent == null ? "—" : `${stats.soldPercent}%`}
          hint={`الأساس: ${stats.denominator} وحدة${project.inventoryBasis === "MANUAL_TOTAL" ? " (يدوي)" : ""}${inv.countReservedAsSold ? "، تشمل المحجوز" : ""}`}
        />
      </div>
      {stats.inconsistent && <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">عدد الوحدات المسجلة يتجاوز إجمالي المخزون اليدوي. راجع الإعداد.</p>}
      {warnings.length > 0 && (
        <ul role="alert" className="mb-4 list-disc rounded-lg bg-amber-50 px-8 py-3 text-sm text-amber-800">
          {warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <ProjectForm project={project} types={types} />

        <div className="space-y-6">
          <Panel title="إجراءات النشر">
            <div className="flex flex-wrap gap-2">
              {project.status !== "PUBLISHED" && <ConfirmAction action={setProjectStatus} label="نشر" variant="outline" fields={{ id, status: "PUBLISHED" }} />}
              {project.status !== "DRAFT" && <ConfirmAction action={setProjectStatus} label="تحويل لمسودة" variant="outline" fields={{ id, status: "DRAFT" }} confirm="سيختفي المشروع من الموقع العام." />}
              {project.status !== "ARCHIVED" && <ConfirmAction action={setProjectStatus} label="أرشفة" fields={{ id, status: "ARCHIVED" }} confirm="سيُخفى المشروع من الموقع ويُنقل للأرشيف. يمكن استعادته لاحقاً." />}
              {project.status === "ARCHIVED" && (
                <ConfirmAction action={deleteProject} label="حذف نهائي" fields={{ id }} confirm={`سيُحذف المشروع ووحداته ومعرضه نهائياً. ${project._count.leads ? "المشروع مرتبط بعملاء ولن يُسمح بحذفه." : "لا يمكن التراجع."}`} />
              )}
            </div>
          </Panel>

          <Panel title={`معرض الصور (${project.images.length})`} actions={<GalleryAdd projectId={id} action={addGalleryImages} />}>
            {project.images.length ? (
              <ul className="space-y-3">
                {project.images.map((im) => (
                  <li key={im.id} className="flex gap-3 rounded-lg border border-line p-2">
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded bg-beige">
                      <Image src={im.media.url} alt="" fill sizes="80px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <ActionForm action={updateGalleryImage} className="grid grid-cols-[60px_1fr] gap-1.5">
                        <input type="hidden" name="id" value={im.id} />
                        <input name="order" defaultValue={im.order} aria-label="الترتيب" className="field px-2 py-1 text-xs" inputMode="numeric" />
                        <input name="captionAr" defaultValue={im.captionAr ?? ""} placeholder="وصف عربي" aria-label="وصف عربي" className="field px-2 py-1 text-xs" />
                        <span />
                        <input name="captionEn" defaultValue={im.captionEn ?? ""} placeholder="English caption" aria-label="English caption" dir="ltr" className="field px-2 py-1 text-xs" />
                        <span />
                        <div className="flex gap-2"><SubmitButton variant="outline" className="px-2 py-1 text-xs">حفظ</SubmitButton></div>
                      </ActionForm>
                      <ConfirmAction action={removeGalleryImage} label="إزالة" variant="link" fields={{ id: im.id }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">لم تُضف صور للمعرض.</p>
            )}
          </Panel>

          <Panel title="الخصائص والمرافق والضمانات">
            <ul className="mb-4 space-y-2">
              {project.features.map((f) => (
                <li key={f.id} className="flex items-start justify-between gap-2 rounded-lg bg-beige-50 px-3 py-2 text-sm">
                  <span><Badge tone="sand">{FEATURE_LABELS[f.kind]}</Badge> {f.labelAr}{f.detailAr && <span className="text-xs text-muted"> — {f.detailAr}</span>}</span>
                  <ConfirmAction action={deleteFeature} label="حذف" variant="link" fields={{ id: f.id }} confirm={`حذف "${f.labelAr}"؟`} />
                </li>
              ))}
              {!project.features.length && <li className="text-sm text-muted">لا توجد عناصر. أضف فقط ما هو مؤكد للمشروع.</li>}
            </ul>
            <ActionForm action={saveFeature} resetOnSuccess className="space-y-2 border-t border-line pt-4">
              <input type="hidden" name="projectId" value={id} />
              <SelectField name="kind" label="النوع" defaultValue="AMENITY" options={options(FEATURE_LABELS)} />
              <TextField name="labelAr" label="الاسم (عربي)" required />
              <TextField name="labelEn" label="الاسم (إنجليزي)" required dir="ltr" />
              <TextField name="detailAr" label="تفاصيل (عربي) — مثل مدة الضمان" />
              <TextField name="detailEn" label="تفاصيل (إنجليزي)" dir="ltr" />
              <TextField name="order" label="الترتيب" defaultValue={project.features.length} inputMode="numeric" />
              <SubmitButton variant="outline" className="w-full">إضافة</SubmitButton>
            </ActionForm>
          </Panel>

          <Panel title="المواقع القريبة">
            <ul className="mb-4 space-y-2">
              {project.nearby.map((n) => (
                <li key={n.id} className="flex items-center justify-between rounded-lg bg-beige-50 px-3 py-2 text-sm">
                  <span>{n.nameAr} {n.minutes != null && <span className="text-xs text-muted">({n.minutes} دقائق)</span>}</span>
                  <ConfirmAction action={deleteNearby} label="حذف" variant="link" fields={{ id: n.id }} />
                </li>
              ))}
              {!project.nearby.length && <li className="text-sm text-muted">أضف المعالم القريبة بعد التحقق من المسافات.</li>}
            </ul>
            <ActionForm action={saveNearby} resetOnSuccess className="space-y-2 border-t border-line pt-4">
              <input type="hidden" name="projectId" value={id} />
              <TextField name="nameAr" label="المعلم (عربي)" required />
              <TextField name="nameEn" label="المعلم (إنجليزي)" required dir="ltr" />
              <TextField name="minutes" label="المسافة بالدقائق" inputMode="numeric" />
              <input type="hidden" name="order" value={project.nearby.length} />
              <SubmitButton variant="outline" className="w-full">إضافة</SubmitButton>
            </ActionForm>
          </Panel>
        </div>
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma, UnitStatus } from "@prisma/client";

import { ActionForm, ConfirmAction, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/forms";
import { MediaField } from "@/components/admin/MediaField";
import { Badge, PageHeader, Panel, Table, Td, FilterBar, AdminPagination } from "@/components/admin/ui";
import { options, UNIT_LABELS, UNIT_TONE } from "@/lib/admin/labels";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { clampPage, firstParam } from "@/lib/utils";
import { bulkUnitStatus, deleteUnit, saveUnit } from "../../../units/actions";

export const metadata = { title: "وحدات المشروع" };
const SIZE = 50;

export default async function ProjectUnits({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser("units.manage");
  const { id } = await params;
  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim().slice(0, 40) ?? "";
  const status = firstParam(sp.status) as UnitStatus | undefined;
  const sort = firstParam(sp.sort) ?? "order";
  const editId = firstParam(sp.edit);
  const page = clampPage(sp.page);

  const project = await prisma.project.findUnique({ where: { id }, select: { id: true, nameAr: true, rangeMode: true } });
  if (!project) notFound();

  const where: Prisma.UnitWhereInput = {
    projectId: id,
    ...(q ? { reference: { contains: q, mode: "insensitive" } } : {}),
    ...(status && status in UNIT_LABELS ? { status } : {}),
  };
  const orderBy: Prisma.UnitOrderByWithRelationInput[] =
    sort === "price" ? [{ price: "asc" }] : sort === "area" ? [{ area: "asc" }] : [{ order: "asc" }, { reference: "asc" }];

  const [types, total, units, editing] = await Promise.all([
    prisma.propertyType.findMany({ orderBy: { order: "asc" } }),
    prisma.unit.count({ where }),
    prisma.unit.findMany({ where, orderBy, skip: (page - 1) * SIZE, take: SIZE, include: { propertyType: true } }),
    editId ? prisma.unit.findFirst({ where: { id: editId, projectId: id }, include: { floorPlan: true } }) : null,
  ]);
  const base = `/admin/projects/${id}/units`;
  const qs = (p: number) => `${base}?${new URLSearchParams({ ...(q && { q }), ...(status && { status }), sort, page: String(p) })}`;

  return (
    <>
      <PageHeader
        title={`وحدات: ${project.nameAr}`}
        description={project.rangeMode === "AUTO_FROM_UNITS" ? "نطاقات الأسعار والمساحات في الموقع تُحدّث تلقائياً من هذه الوحدات." : "النطاقات في هذا المشروع يدوية؛ ستظهر تنبيهات إن خالفتها الوحدات."}
        actions={<Link href={`/admin/projects/${id}`} className="btn-outline px-3 py-1.5 text-xs">العودة للمشروع</Link>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div>
          <FilterBar>
            <label className="text-sm"><span className="field-label">رقم الوحدة</span><input name="q" defaultValue={q} className="field py-2" /></label>
            <label className="text-sm"><span className="field-label">الحالة</span>
              <select name="status" defaultValue={status ?? ""} className="field py-2"><option value="">الكل</option>{options(UNIT_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            </label>
            <label className="text-sm"><span className="field-label">الترتيب</span>
              <select name="sort" defaultValue={sort} className="field py-2"><option value="order">الترتيب</option><option value="price">السعر</option><option value="area">المساحة</option></select>
            </label>
          </FilterBar>
          <ActionForm action={bulkUnitStatus}>
            <input type="hidden" name="projectId" value={id} />
            <Table head={["", "الوحدة", "النوع", "المساحة", "السعر", "غرف/حمامات", "الدور", "الحالة", ""]} empty={units.length ? false : "لا توجد وحدات. أضف الوحدات من النموذج."}>
              {units.map((u) => (
                <tr key={u.id} className={u.id === editId ? "bg-beige-50" : undefined}>
                  <Td><input type="checkbox" name="unitIds" value={u.id} aria-label={`تحديد ${u.reference}`} className="h-4 w-4 accent-navy" /></Td>
                  <Td className="font-medium">{u.reference}</Td>
                  <Td>{u.propertyType?.nameAr ?? "—"}</Td>
                  <Td>{u.area != null ? `${formatNumber(u.area, "ar")} م²` : "—"}</Td>
                  <Td>{u.price != null ? formatNumber(u.price, "ar") : "—"}</Td>
                  <Td>{u.bedrooms ?? "—"} / {u.bathrooms ?? "—"}</Td>
                  <Td>{u.floorAr ?? "—"}</Td>
                  <Td><Badge tone={UNIT_TONE[u.status]}>{UNIT_LABELS[u.status]}</Badge></Td>
                  <Td><Link href={`${base}?edit=${u.id}`} className="text-sm text-navy hover:underline">تعديل</Link></Td>
                </tr>
              ))}
            </Table>
            {units.length > 0 && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <SelectField name="bulkStatus" label="تغيير حالة المحدد إلى" placeholder="— اختر —" options={options(UNIT_LABELS)} />
                <SubmitButton variant="outline">تطبيق على المحدد</SubmitButton>
              </div>
            )}
          </ActionForm>
          <AdminPagination page={page} pages={Math.ceil(total / SIZE)} total={total} hrefFor={qs} />
        </div>

        <Panel title={editing ? `تعديل الوحدة ${editing.reference}` : "إضافة وحدة"} actions={editing ? <Link href={base} className="text-xs text-navy">+ وحدة جديدة</Link> : null}>
          <ActionForm key={editing?.id ?? "new"} action={saveUnit} resetOnSuccess={!editing} className="space-y-3">
            <input type="hidden" name="projectId" value={id} />
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid grid-cols-2 gap-3">
              <TextField name="reference" label="رقم الوحدة" defaultValue={editing?.reference} required dir="ltr" />
              <SelectField name="status" label="الحالة" defaultValue={editing?.status ?? "AVAILABLE"} options={options(UNIT_LABELS)} />
              <SelectField name="propertyTypeId" label="النوع" defaultValue={editing?.propertyTypeId} placeholder="نوع المشروع" options={types.map((t) => ({ value: t.id, label: t.nameAr }))} />
              <TextField name="area" label="المساحة م²" defaultValue={editing?.area} inputMode="decimal" dir="ltr" />
              <TextField name="price" label="السعر (ريال)" defaultValue={editing?.price} inputMode="numeric" dir="ltr" />
              <TextField name="order" label="الترتيب" defaultValue={editing?.order ?? 0} inputMode="numeric" />
              <TextField name="bedrooms" label="غرف النوم" defaultValue={editing?.bedrooms} inputMode="numeric" />
              <TextField name="bathrooms" label="دورات المياه" defaultValue={editing?.bathrooms} inputMode="numeric" />
              <TextField name="floorAr" label="الدور (عربي)" defaultValue={editing?.floorAr} />
              <TextField name="floorEn" label="الدور (إنجليزي)" defaultValue={editing?.floorEn} dir="ltr" />
            </div>
            <TextArea name="featuresAr" label="مزايا الوحدة (عربي)" defaultValue={editing?.featuresAr} rows={2} />
            <TextArea name="featuresEn" label="مزايا الوحدة (إنجليزي)" defaultValue={editing?.featuresEn} rows={2} dir="ltr" />
            <MediaField name="floorPlanId" label="المخطط (صورة أو PDF)" accept="all" defaultValue={editing?.floorPlan} />
            <SubmitButton className="w-full">{editing ? "حفظ الوحدة" : "إضافة الوحدة"}</SubmitButton>
          </ActionForm>
          {editing && (
            <div className="mt-4 border-t border-line pt-4">
              <ConfirmAction action={deleteUnit} label="حذف الوحدة" fields={{ id: editing.id }} confirm={`حذف الوحدة ${editing.reference} نهائياً؟`} />
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

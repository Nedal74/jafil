import Link from "next/link";
import type { Prisma, UnitStatus } from "@prisma/client";

import { AdminPagination, Badge, FilterBar, PageHeader, StatCard, Table, Td } from "@/components/admin/ui";
import { options, UNIT_LABELS, UNIT_TONE } from "@/lib/admin/labels";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { clampPage, firstParam } from "@/lib/utils";

export const metadata = { title: "مخزون الوحدات" };
const SIZE = 50;

/** Cross-project inventory search for sales and content teams. */
export default async function UnitsInventory({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser("units.manage");
  const sp = await searchParams;
  const project = firstParam(sp.project) ?? "";
  const status = firstParam(sp.status) as UnitStatus | undefined;
  const maxPrice = Number(firstParam(sp.maxPrice)) || undefined;
  const minBeds = Number(firstParam(sp.bedrooms)) || undefined;
  const page = clampPage(sp.page);

  const where: Prisma.UnitWhereInput = {
    ...(project ? { projectId: project } : {}),
    ...(status && status in UNIT_LABELS ? { status } : {}),
    ...(maxPrice ? { price: { lte: maxPrice } } : {}),
    ...(minBeds ? { bedrooms: { gte: minBeds } } : {}),
  };
  const [projects, total, units, grouped] = await Promise.all([
    prisma.project.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } }),
    prisma.unit.count({ where }),
    prisma.unit.findMany({ where, orderBy: [{ project: { nameAr: "asc" } }, { order: "asc" }], skip: (page - 1) * SIZE, take: SIZE, include: { project: { select: { nameAr: true } } } }),
    prisma.unit.groupBy({ by: ["status"], where: project ? { projectId: project } : {}, _count: true }),
  ]);
  const count = (s: UnitStatus) => grouped.find((g) => g.status === s)?._count ?? 0;
  const qs = (p: number) =>
    `/admin/units?${new URLSearchParams({ ...(project && { project }), ...(status && { status }), ...(maxPrice && { maxPrice: String(maxPrice) }), ...(minBeds && { bedrooms: String(minBeds) }), page: String(p) })}`;

  return (
    <>
      <PageHeader title="مخزون الوحدات" description="بحث في وحدات جميع المشاريع. للتعديل افتح وحدات المشروع." />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {(["AVAILABLE", "RESERVED", "SOLD", "UNPUBLISHED"] as const).map((s) => <StatCard key={s} label={UNIT_LABELS[s]} value={formatNumber(count(s), "ar")} />)}
      </div>
      <FilterBar>
        <label className="text-sm"><span className="field-label">المشروع</span>
          <select name="project" defaultValue={project} className="field py-2"><option value="">الكل</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.nameAr}</option>)}</select>
        </label>
        <label className="text-sm"><span className="field-label">الحالة</span>
          <select name="status" defaultValue={status ?? ""} className="field py-2"><option value="">الكل</option>{options(UNIT_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </label>
        <label className="text-sm"><span className="field-label">أعلى سعر</span><input name="maxPrice" defaultValue={maxPrice ?? ""} inputMode="numeric" className="field py-2" dir="ltr" /></label>
        <label className="text-sm"><span className="field-label">أقل عدد غرف</span><input name="bedrooms" defaultValue={minBeds ?? ""} inputMode="numeric" className="field py-2" /></label>
      </FilterBar>
      <Table head={["المشروع", "الوحدة", "المساحة", "السعر", "الغرف", "الحالة", ""]} empty={units.length ? false : "لا توجد وحدات مطابقة"}>
        {units.map((u) => (
          <tr key={u.id}>
            <Td>{u.project.nameAr}</Td>
            <Td className="font-medium">{u.reference}</Td>
            <Td>{u.area != null ? `${formatNumber(u.area, "ar")} م²` : "—"}</Td>
            <Td>{u.price != null ? formatNumber(u.price, "ar") : "—"}</Td>
            <Td>{u.bedrooms ?? "—"}</Td>
            <Td><Badge tone={UNIT_TONE[u.status]}>{UNIT_LABELS[u.status]}</Badge></Td>
            <Td><Link href={`/admin/projects/${u.projectId}/units?edit=${u.id}`} className="text-sm text-navy hover:underline">تعديل</Link></Td>
          </tr>
        ))}
      </Table>
      <AdminPagination page={page} pages={Math.ceil(total / SIZE)} total={total} hrefFor={qs} />
    </>
  );
}

import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { Badge, EmptyAdmin, FilterBar, PageHeader, Table, Td, AdminPagination } from "@/components/admin/ui";
import { PUBLISH_LABELS, PUBLISH_TONE, SALES_LABELS, CONSTRUCTION_LABELS } from "@/lib/admin/labels";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { clampPage, firstParam, PAGE_SIZE } from "@/lib/utils";

export const metadata = { title: "المشاريع" };

export default async function ProjectsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser("projects.manage");
  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim().slice(0, 80) ?? "";
  const status = firstParam(sp.status);
  const sort = firstParam(sp.sort) ?? "order";
  const page = clampPage(sp.page);

  const where: Prisma.ProjectWhereInput = {
    ...(q ? { OR: [{ nameAr: { contains: q, mode: "insensitive" } }, { nameEn: { contains: q, mode: "insensitive" } }, { neighborhoodAr: { contains: q } }] } : {}),
    ...(status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED" ? { status } : { status: { not: "ARCHIVED" } }),
  };
  const orderBy: Prisma.ProjectOrderByWithRelationInput[] =
    sort === "updated" ? [{ updatedAt: "desc" }] : sort === "name" ? [{ nameAr: "asc" }] : [{ displayOrder: "asc" }, { createdAt: "desc" }];

  const [total, projects] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { coverImage: { select: { url: true } }, propertyType: true, _count: { select: { units: true, leads: true } } },
    }),
  ]);
  const qs = (p: number) => `/admin/projects?${new URLSearchParams({ ...(q && { q }), ...(status && { status }), sort, page: String(p) })}`;

  return (
    <>
      <PageHeader title="المشاريع" description="أنشئ المشاريع وعدّلها وانشرها. كل بيانات الموقع العام تأتي من هنا." actions={<Link href="/admin/projects/new" className="btn-primary">+ مشروع جديد</Link>} />
      <FilterBar>
        <label className="text-sm"><span className="field-label">بحث</span><input name="q" defaultValue={q} className="field py-2" /></label>
        <label className="text-sm"><span className="field-label">الحالة</span>
          <select name="status" defaultValue={status ?? ""} className="field py-2">
            <option value="">النشطة (غير المؤرشفة)</option>
            <option value="DRAFT">مسودة</option><option value="PUBLISHED">منشور</option><option value="ARCHIVED">مؤرشف</option>
          </select>
        </label>
        <label className="text-sm"><span className="field-label">الترتيب</span>
          <select name="sort" defaultValue={sort} className="field py-2">
            <option value="order">ترتيب العرض</option><option value="updated">آخر تعديل</option><option value="name">الاسم</option>
          </select>
        </label>
      </FilterBar>
      {projects.length ? (
        <>
          <Table head={["المشروع", "النوع", "الحالة", "البيع / الإنشاء", "الوحدات", "العملاء", ""]}>
            {projects.map((p) => (
              <tr key={p.id} className="hover:bg-beige-50/50">
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded bg-beige">
                      {p.coverImage && <Image src={p.coverImage.url} alt="" fill sizes="64px" className="object-cover" />}
                    </div>
                    <div>
                      <Link href={`/admin/projects/${p.id}`} className="font-medium text-navy hover:underline">{p.nameAr}</Link>
                      <p className="text-xs text-muted">{p.neighborhoodAr ?? ""} {p.featured && "· مميز"}</p>
                    </div>
                  </div>
                </Td>
                <Td>{p.propertyType?.nameAr ?? "—"}</Td>
                <Td><Badge tone={PUBLISH_TONE[p.status]}>{PUBLISH_LABELS[p.status]}</Badge></Td>
                <Td className="text-xs">{SALES_LABELS[p.salesStatus]}<br /><span className="text-muted">{CONSTRUCTION_LABELS[p.constructionStatus]}</span></Td>
                <Td>{formatNumber(p._count.units, "ar")}</Td>
                <Td>{formatNumber(p._count.leads, "ar")}</Td>
                <Td><div className="flex gap-3 text-sm"><Link href={`/admin/projects/${p.id}`} className="text-navy hover:underline">تعديل</Link><Link href={`/admin/projects/${p.id}/units`} className="text-navy hover:underline">الوحدات</Link></div></Td>
              </tr>
            ))}
          </Table>
          <AdminPagination page={page} pages={Math.ceil(total / PAGE_SIZE)} total={total} hrefFor={qs} />
        </>
      ) : (
        <EmptyAdmin text={q || status ? "لا توجد مشاريع مطابقة" : "لم تُضف أي مشاريع بعد. ابدأ بإضافة أول مشروع."} action={<Link href="/admin/projects/new" className="btn-primary">+ مشروع جديد</Link>} />
      )}
    </>
  );
}

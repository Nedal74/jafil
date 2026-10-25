import Link from "next/link";
import type { PublishStatus } from "@prisma/client";

import { AdminPagination, Badge, EmptyAdmin, FilterBar, PageHeader, Table, Td } from "@/components/admin/ui";
import { PUBLISH_LABELS, PUBLISH_TONE } from "@/lib/admin/labels";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { clampPage, firstParam, PAGE_SIZE } from "@/lib/utils";

export const metadata = { title: "الأخبار والمقالات" };

export default async function ArticlesAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser("articles.manage");
  const sp = await searchParams;
  const q = firstParam(sp.q)?.slice(0, 80) ?? "";
  const status = firstParam(sp.status) as PublishStatus | undefined;
  const page = clampPage(sp.page);
  const where = {
    ...(q ? { OR: [{ titleAr: { contains: q, mode: "insensitive" as const } }, { titleEn: { contains: q, mode: "insensitive" as const } }] } : {}),
    ...(status && status in PUBLISH_LABELS ? { status } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  return (
    <>
      <PageHeader title="الأخبار والمقالات" actions={<Link href="/admin/articles/new" className="btn-primary">+ مقال جديد</Link>} />
      <FilterBar>
        <label className="text-sm"><span className="field-label">بحث</span><input name="q" defaultValue={q} className="field py-2" /></label>
        <label className="text-sm"><span className="field-label">الحالة</span>
          <select name="status" defaultValue={status ?? ""} className="field py-2"><option value="">الكل</option><option value="DRAFT">مسودة</option><option value="PUBLISHED">منشور</option><option value="ARCHIVED">مؤرشف</option></select>
        </label>
      </FilterBar>
      {items.length ? (
        <>
          <Table head={["العنوان", "الحالة", "تاريخ النشر", "آخر تعديل"]}>
            {items.map((a) => (
              <tr key={a.id}>
                <Td><Link href={`/admin/articles/${a.id}`} className="font-medium text-navy hover:underline">{a.titleAr}</Link></Td>
                <Td><Badge tone={PUBLISH_TONE[a.status]}>{PUBLISH_LABELS[a.status]}</Badge></Td>
                <Td className="text-xs">{a.publishedAt ? formatDateTime(a.publishedAt) : "—"}</Td>
                <Td className="text-xs text-muted">{formatDateTime(a.updatedAt)}</Td>
              </tr>
            ))}
          </Table>
          <AdminPagination page={page} pages={Math.ceil(total / PAGE_SIZE)} total={total} hrefFor={(p) => `/admin/articles?${new URLSearchParams({ ...(q && { q }), ...(status && { status }), page: String(p) })}`} />
        </>
      ) : (
        <EmptyAdmin text="لا توجد مقالات." action={<Link href="/admin/articles/new" className="btn-primary">+ مقال جديد</Link>} />
      )}
    </>
  );
}

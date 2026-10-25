import Link from "next/link";

import { AdminPagination, Badge, FilterBar, PageHeader, Table, Td } from "@/components/admin/ui";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, LEAD_STATUS_TONE, options } from "@/lib/admin/labels";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { leadScope, leadWhere, type LeadFilters } from "@/lib/leads/scope";
import { displaySaudiMobile } from "@/lib/phone";
import { clampPage, firstParam, PAGE_SIZE } from "@/lib/utils";

export const metadata = { title: "العملاء المحتملون" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("leads.view");
  const sp = await searchParams;
  const f: LeadFilters = {
    q: firstParam(sp.q),
    status: firstParam(sp.status),
    source: firstParam(sp.source),
    project: firstParam(sp.project),
    assignee: firstParam(sp.assignee),
    from: firstParam(sp.from),
    to: firstParam(sp.to),
  };
  const sort = firstParam(sp.sort) === "oldest" ? "asc" : "desc";
  const page = clampPage(sp.page);
  const where = leadWhere(user, f);

  const [total, leads, pipeline, projects, agents, waClicks] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: sort },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { project: { select: { nameAr: true } }, assignedTo: { select: { name: true } } },
    }),
    prisma.lead.groupBy({ by: ["status"], where: leadScope(user), _count: true }),
    prisma.project.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } }),
    prisma.user.findMany({ where: { active: true, role: { in: ["SALES_AGENT", "SUPER_ADMIN"] } }, select: { id: true, name: true } }),
    prisma.ctaClick.count({ where: { channel: "whatsapp", createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }),
  ]);
  const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as Record<string, string>;
  const qs = (p: number) => `/admin/leads?${new URLSearchParams({ ...params, ...(sort === "asc" && { sort: "oldest" }), page: String(p) })}`;
  const exportHref = `/api/admin/leads/export?${new URLSearchParams(params)}`;

  return (
    <>
      <PageHeader
        title="العملاء المحتملون"
        description={`نقرات واتساب المسجلة آخر 30 يوماً: ${waClicks} (مجهولة الهوية، لا تُنشئ عملاء).`}
        actions={
          <>
            {can(user.role, "leads.export") && <a href={exportHref} className="btn-outline">تصدير CSV</a>}
            <Link href="/admin/leads/new" className="btn-primary">+ عميل يدوي</Link>
          </>
        }
      />
      <nav aria-label="مراحل البيع" className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/leads" className="rounded-full border border-line bg-white px-3 py-1.5 text-sm aria-[current=true]:border-navy" aria-current={!f.status}>الكل</Link>
        {options(LEAD_STATUS_LABELS).map((o) => (
          <Link key={o.value} href={`/admin/leads?status=${o.value}`} aria-current={f.status === o.value} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm aria-[current=true]:border-navy aria-[current=true]:bg-navy aria-[current=true]:text-white">
            {o.label} <span className="opacity-60">{pipeline.find((p) => p.status === o.value)?._count ?? 0}</span>
          </Link>
        ))}
      </nav>
      <FilterBar>
        <label className="text-sm"><span className="field-label">بحث (اسم/جوال/بريد)</span><input name="q" defaultValue={f.q} className="field py-2" /></label>
        {f.status && <input type="hidden" name="status" value={f.status} />}
        <label className="text-sm"><span className="field-label">المصدر</span>
          <select name="source" defaultValue={f.source ?? ""} className="field py-2"><option value="">الكل</option>{options(LEAD_SOURCE_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </label>
        <label className="text-sm"><span className="field-label">المشروع</span>
          <select name="project" defaultValue={f.project ?? ""} className="field py-2"><option value="">الكل</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.nameAr}</option>)}</select>
        </label>
        {can(user.role, "leads.view_all") && (
          <label className="text-sm"><span className="field-label">المسؤول</span>
            <select name="assignee" defaultValue={f.assignee ?? ""} className="field py-2"><option value="">الكل</option><option value="none">غير مُسند</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          </label>
        )}
        <label className="text-sm"><span className="field-label">من</span><input type="date" name="from" defaultValue={f.from} className="field py-2" /></label>
        <label className="text-sm"><span className="field-label">إلى</span><input type="date" name="to" defaultValue={f.to} className="field py-2" /></label>
        <label className="text-sm"><span className="field-label">الترتيب</span>
          <select name="sort" defaultValue={sort === "asc" ? "oldest" : ""} className="field py-2"><option value="">الأحدث</option><option value="oldest">الأقدم</option></select>
        </label>
      </FilterBar>
      <Table head={["العميل", "الجوال", "المصدر", "المشروع", "الحالة", "المسؤول", "التاريخ"]} empty={leads.length ? false : "لا يوجد عملاء مطابقون"}>
        {leads.map((l) => (
          <tr key={l.id} className="hover:bg-beige-50/50">
            <Td>
              <Link href={`/admin/leads/${l.id}`} className="font-medium text-navy hover:underline">{l.name}</Link>
              {l.possibleDuplicateOfId && <Badge tone="amber">مكرر محتمل</Badge>}
            </Td>
            <Td><span dir="ltr">{displaySaudiMobile(l.phoneNormalized)}</span></Td>
            <Td className="text-xs">{LEAD_SOURCE_LABELS[l.source]}</Td>
            <Td className="text-xs">{l.project?.nameAr ?? "—"}</Td>
            <Td><Badge tone={LEAD_STATUS_TONE[l.status]}>{LEAD_STATUS_LABELS[l.status]}</Badge></Td>
            <Td className="text-xs">{l.assignedTo?.name ?? <span className="text-muted">غير مُسند</span>}</Td>
            <Td className="text-xs text-muted">{formatDateTime(l.createdAt)}</Td>
          </tr>
        ))}
      </Table>
      <AdminPagination page={page} pages={Math.ceil(total / PAGE_SIZE)} total={total} hrefFor={qs} />
    </>
  );
}

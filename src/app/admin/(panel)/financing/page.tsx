import Link from "next/link";

import { AdminPagination, Badge, FilterBar, PageHeader, Table, Td } from "@/components/admin/ui";
import { FIN_OP_LABELS, FIN_STATUS_LABELS, options } from "@/lib/admin/labels";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { financingWhere } from "@/lib/financing/filters";
import { formatDateTime } from "@/lib/format";
import { displaySaudiMobile } from "@/lib/phone";
import { clampPage, firstParam, PAGE_SIZE } from "@/lib/utils";

export const metadata = { title: "طلبات التمويل" };

export default async function FinancingList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("financing.view");
  const sp = await searchParams;
  const f = { q: firstParam(sp.q), status: firstParam(sp.status), assignee: firstParam(sp.assignee), from: firstParam(sp.from), to: firstParam(sp.to) };
  const page = clampPage(sp.page);
  const where = financingWhere(f);
  const [total, apps, staff] = await Promise.all([
    prisma.financingApplication.count({ where }),
    prisma.financingApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, reference: true, fullName: true, phoneNormalized: true, operation: true, status: true, createdAt: true, assignedTo: { select: { name: true } } },
    }),
    prisma.user.findMany({ where: { active: true, role: { in: ["FINANCING_MANAGER", "SUPER_ADMIN"] } }, select: { id: true, name: true } }),
  ]);
  const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as Record<string, string>;
  return (
    <>
      <PageHeader
        title="طلبات التمويل"
        description="بيانات مالية حساسة: تُعرض للمخولين فقط ولا تُشارك مع المساعد العقاري أو أي واجهة عامة."
        actions={can(user.role, "financing.export") && <a className="btn-outline" href={`/api/admin/financing/export?${new URLSearchParams(params)}`}>تصدير CSV</a>}
      />
      <FilterBar>
        <label className="text-sm"><span className="field-label">بحث (اسم/جوال/مرجع)</span><input name="q" defaultValue={f.q} className="field py-2" /></label>
        <label className="text-sm"><span className="field-label">الحالة</span>
          <select name="status" defaultValue={f.status ?? ""} className="field py-2"><option value="">الكل</option>{options(FIN_STATUS_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </label>
        <label className="text-sm"><span className="field-label">المسؤول</span>
          <select name="assignee" defaultValue={f.assignee ?? ""} className="field py-2"><option value="">الكل</option><option value="none">غير مُسند</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </label>
        <label className="text-sm"><span className="field-label">من</span><input type="date" name="from" defaultValue={f.from} className="field py-2" /></label>
        <label className="text-sm"><span className="field-label">إلى</span><input type="date" name="to" defaultValue={f.to} className="field py-2" /></label>
      </FilterBar>
      <Table head={["المرجع", "الاسم", "الجوال", "العملية", "الحالة", "المسؤول", "التاريخ"]} empty={apps.length ? false : "لا توجد طلبات"}>
        {apps.map((a) => (
          <tr key={a.id} className="hover:bg-beige-50/50">
            <Td><Link href={`/admin/financing/${a.id}`} className="font-mono text-xs text-navy hover:underline" dir="ltr">{a.reference}</Link></Td>
            <Td>{a.fullName}</Td>
            <Td><span dir="ltr">{displaySaudiMobile(a.phoneNormalized)}</span></Td>
            <Td>{FIN_OP_LABELS[a.operation]}</Td>
            <Td><Badge tone={a.status === "NEW" ? "blue" : a.status === "CLOSED" ? "gray" : "sand"}>{FIN_STATUS_LABELS[a.status]}</Badge></Td>
            <Td className="text-xs">{a.assignedTo?.name ?? "—"}</Td>
            <Td className="text-xs text-muted">{formatDateTime(a.createdAt)}</Td>
          </tr>
        ))}
      </Table>
      <AdminPagination page={page} pages={Math.ceil(total / PAGE_SIZE)} total={total} hrefFor={(p) => `/admin/financing?${new URLSearchParams({ ...params, page: String(p) })}`} />
    </>
  );
}

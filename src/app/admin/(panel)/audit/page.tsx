import { AdminPagination, FilterBar, PageHeader, Table, Td } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { clampPage, firstParam } from "@/lib/utils";

export const metadata = { title: "سجل التدقيق" };
const SIZE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser("audit.view");
  const sp = await searchParams;
  const entity = firstParam(sp.entity)?.slice(0, 40);
  const user = firstParam(sp.user);
  const page = clampPage(sp.page);
  const where = { ...(entity ? { entity } : {}), ...(user ? { userId: user } : {}) };
  const [total, logs, users, entities] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * SIZE, take: SIZE, include: { user: { select: { name: true } } } }),
    prisma.user.findMany({ select: { id: true, name: true } }),
    prisma.auditLog.findMany({ distinct: ["entity"], select: { entity: true } }),
  ]);
  return (
    <>
      <PageHeader title="سجل التدقيق" description="سجل غير قابل للتعديل من اللوحة لكل الإجراءات المهمة." />
      <FilterBar>
        <label className="text-sm"><span className="field-label">النوع</span>
          <select name="entity" defaultValue={entity ?? ""} className="field py-2"><option value="">الكل</option>{entities.map((e) => <option key={e.entity}>{e.entity}</option>)}</select>
        </label>
        <label className="text-sm"><span className="field-label">المستخدم</span>
          <select name="user" defaultValue={user ?? ""} className="field py-2"><option value="">الكل</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        </label>
      </FilterBar>
      <Table head={["الوقت", "المستخدم", "الإجراء", "النوع", "الوصف"]} empty={logs.length ? false : "لا توجد سجلات"}>
        {logs.map((l) => (
          <tr key={l.id}>
            <Td className="whitespace-nowrap text-xs text-muted">{formatDateTime(l.createdAt)}</Td>
            <Td className="text-xs">{l.user?.name ?? "النظام"}</Td>
            <Td className="text-xs" ><span dir="ltr">{l.action}</span></Td>
            <Td className="text-xs">{l.entity}</Td>
            <Td className="text-xs">{l.summary}</Td>
          </tr>
        ))}
      </Table>
      <AdminPagination page={page} pages={Math.ceil(total / SIZE)} total={total} hrefFor={(p) => `/admin/audit?${new URLSearchParams({ ...(entity && { entity }), ...(user && { user }), page: String(p) })}`} />
    </>
  );
}

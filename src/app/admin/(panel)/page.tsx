import Link from "next/link";

import { Badge, PageHeader, Panel, StatCard, Table, Td } from "@/components/admin/ui";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, LEAD_STATUS_TONE } from "@/lib/admin/labels";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { leadScope } from "@/lib/leads/scope";
import { computeInventory } from "@/lib/projects/inventory";
import { getSetting } from "@/lib/settings";

export const metadata = { title: "نظرة عامة" };

export default async function Overview() {
  const user = await requireUser("dashboard.view");
  const since7 = new Date(Date.now() - 7 * 86_400_000);
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const seeLeads = can(user.role, "leads.view");
  const seeFin = can(user.role, "financing.view");
  const seeProjects = can(user.role, "projects.manage") || can(user.role, "units.manage");

  const scope = leadScope(user);
  const [leads7, leadsNew, leadsBySource, recentLeads, fin7, finNew, projects, inv, wa30, chats30] = await Promise.all([
    seeLeads ? prisma.lead.count({ where: { AND: [scope, { createdAt: { gte: since7 } }] } }) : 0,
    seeLeads ? prisma.lead.count({ where: { AND: [scope, { status: "NEW" }] } }) : 0,
    seeLeads ? prisma.lead.groupBy({ by: ["source"], where: { AND: [scope, { createdAt: { gte: since30 } }] }, _count: true }) : [],
    seeLeads ? prisma.lead.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 6, include: { project: { select: { nameAr: true } } } }) : [],
    seeFin ? prisma.financingApplication.count({ where: { createdAt: { gte: since7 } } }) : 0,
    seeFin ? prisma.financingApplication.count({ where: { status: "NEW" } }) : 0,
    seeProjects
      ? prisma.project.findMany({
          where: { status: "PUBLISHED" },
          select: { id: true, nameAr: true, inventoryBasis: true, manualInventoryTotal: true, units: { select: { status: true } } },
          orderBy: { displayOrder: "asc" },
          take: 12,
        })
      : [],
    getSetting("inventory"),
    prisma.ctaClick.count({ where: { channel: "whatsapp", createdAt: { gte: since30 } } }),
    prisma.chatConversation.count({ where: { createdAt: { gte: since30 } } }),
  ]);

  return (
    <>
      <PageHeader title={`مرحباً ${user.name}`} description="ملخص النشاط. الأرقام من قاعدة البيانات مباشرة." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {seeLeads && <StatCard label="عملاء جدد (7 أيام)" value={formatNumber(leads7, "ar")} href="/admin/leads" />}
        {seeLeads && <StatCard label="بانتظار التواصل" value={formatNumber(leadsNew, "ar")} href="/admin/leads?status=NEW" />}
        {seeFin && <StatCard label="طلبات تمويل (7 أيام)" value={formatNumber(fin7, "ar")} href="/admin/financing" />}
        {seeFin && <StatCard label="طلبات تمويل جديدة" value={formatNumber(finNew, "ar")} href="/admin/financing?status=NEW" />}
        <StatCard label="نقرات واتساب (30 يوماً)" value={formatNumber(wa30, "ar")} />
        <StatCard label="محادثات المساعد (30 يوماً)" value={formatNumber(chats30, "ar")} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {seeLeads && (
          <Panel title="أحدث العملاء" actions={<Link href="/admin/leads" className="text-sm text-navy">عرض الكل</Link>}>
            {recentLeads.length ? (
              <ul className="divide-y divide-line">
                {recentLeads.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span><Link href={`/admin/leads/${l.id}`} className="font-medium text-navy hover:underline">{l.name}</Link><span className="block text-xs text-muted">{LEAD_SOURCE_LABELS[l.source]}{l.project ? ` · ${l.project.nameAr}` : ""} · {formatDateTime(l.createdAt)}</span></span>
                    <Badge tone={LEAD_STATUS_TONE[l.status]}>{LEAD_STATUS_LABELS[l.status]}</Badge>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">لا يوجد عملاء بعد.</p>}
          </Panel>
        )}
        {seeLeads && (
          <Panel title="مصادر العملاء (30 يوماً)">
            {leadsBySource.length ? (
              <ul className="space-y-2">
                {leadsBySource.sort((a, b) => b._count - a._count).map((s) => {
                  const max = Math.max(...leadsBySource.map((x) => x._count));
                  return (
                    <li key={s.source} className="text-sm">
                      <div className="flex justify-between"><span>{LEAD_SOURCE_LABELS[s.source]}</span><span className="font-medium">{s._count}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-beige-50"><div className="h-2 rounded-full bg-sand" style={{ width: `${(s._count / max) * 100}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-muted">لا توجد بيانات.</p>}
          </Panel>
        )}
        {seeProjects && (
          <Panel title="مبيعات المشاريع المنشورة" className="xl:col-span-2">
            <Table head={["المشروع", "متاح", "محجوز", "مباع", "المقام", "نسبة المبيعات"]} empty={projects.length ? false : "لا توجد مشاريع منشورة"}>
              {projects.map((p) => {
                const s = computeInventory(p.units, p.inventoryBasis, p.manualInventoryTotal, inv.countReservedAsSold);
                return (
                  <tr key={p.id}>
                    <Td><Link href={`/admin/projects/${p.id}`} className="text-navy hover:underline">{p.nameAr}</Link></Td>
                    <Td>{s.available}</Td><Td>{s.reserved}</Td><Td>{s.sold}</Td><Td>{s.denominator}</Td>
                    <Td>
                      {s.soldPercent == null ? <span className="text-muted">لا يوجد مخزون</span> : (
                        <div className="flex items-center gap-2"><div className="h-2 w-24 rounded-full bg-beige-50"><div className="h-2 rounded-full bg-navy" style={{ width: `${Math.min(100, s.soldPercent)}%` }} /></div>{s.soldPercent}%</div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </Table>
          </Panel>
        )}
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm, SelectField, SubmitButton, TextArea } from "@/components/admin/forms";
import { Badge, PageHeader, Panel } from "@/components/admin/ui";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, LEAD_STATUS_TONE, options } from "@/lib/admin/labels";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { leadScope } from "@/lib/leads/scope";
import { displaySaudiMobile, whatsappLink } from "@/lib/phone";
import { addLeadNote, assignLead, updateLeadStatus } from "../actions";

export const metadata = { title: "تفاصيل العميل" };

const ACTIVITY: Record<string, string> = { created: "إنشاء", status: "تغيير الحالة", assign: "إسناد", note: "ملاحظة", duplicate_flagged: "تنبيه تكرار" };

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("leads.view");
  const { id } = await params;
  const lead = await prisma.lead.findFirst({
    where: { AND: [{ id }, leadScope(user)] },
    include: {
      project: { select: { id: true, nameAr: true } },
      unit: { select: { reference: true } },
      assignedTo: { select: { id: true, name: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      activities: { orderBy: { createdAt: "desc" }, take: 50, include: { actor: { select: { name: true } } } },
      chats: { select: { id: true, createdAt: true } },
    },
  });
  if (!lead) notFound();

  const [duplicates, agents] = await Promise.all([
    prisma.lead.findMany({
      where: { AND: [{ id: { not: lead.id } }, leadScope(user), { OR: [{ phoneNormalized: lead.phoneNormalized }, ...(lead.email ? [{ email: lead.email }] : [])] }] },
      select: { id: true, name: true, createdAt: true, status: true },
      take: 10,
    }),
    prisma.user.findMany({ where: { active: true, role: { in: ["SALES_AGENT", "SUPER_ADMIN"] } }, select: { id: true, name: true } }),
  ]);
  const canManage = can(user.role, "leads.manage");
  const canAssign = can(user.role, "leads.assign");
  const wa = whatsappLink(lead.phoneNormalized);

  const facts: [string, React.ReactNode][] = [
    ["الجوال", <span key="p" dir="ltr">{displaySaudiMobile(lead.phoneNormalized)}</span>],
    ["البريد", lead.email ?? "—"],
    ["المصدر", LEAD_SOURCE_LABELS[lead.source]],
    ["المشروع", lead.project ? <Link key="pr" className="text-navy underline" href={`/admin/projects/${lead.project.id}`}>{lead.project.nameAr}</Link> : "—"],
    ["الوحدة", lead.unit?.reference ?? "—"],
    ["نوع العقار المفضل", lead.propertyTypeKey ?? "—"],
    ["الموقع المفضل", lead.preferredLocation ?? "—"],
    ["الميزانية", lead.budgetMin || lead.budgetMax ? `${lead.budgetMin ? formatNumber(lead.budgetMin, "ar") : "—"} – ${lead.budgetMax ? formatNumber(lead.budgetMax, "ar") : "—"} ريال` : "—"],
    ["الغرف", lead.bedrooms ?? "—"],
    ["صفحة الوصول", lead.landingPage ?? "—"],
    ["اللغة", lead.locale === "ar" ? "العربية" : "English"],
    ["الموافقة", lead.consent ? `موافق — ${lead.consentAt ? formatDateTime(lead.consentAt) : ""}` : "لا"],
    ["تاريخ الإنشاء", formatDateTime(lead.createdAt)],
  ];

  return (
    <>
      <PageHeader
        title={lead.name}
        actions={
          <>
            <Badge tone={LEAD_STATUS_TONE[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
            <a href={`tel:${displaySaudiMobile(lead.phoneNormalized)}`} className="btn-outline px-3 py-1.5 text-xs">اتصال</a>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline px-3 py-1.5 text-xs">واتساب</a>}
          </>
        }
      />
      {duplicates.length > 0 && (
        <div role="alert" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          يوجد {duplicates.length} سجل بنفس الجوال أو البريد. راجعها قبل التواصل (لا يتم الدمج تلقائياً):
          <ul className="mt-1 list-disc ps-6">
            {duplicates.map((d) => <li key={d.id}><Link href={`/admin/leads/${d.id}`} className="underline">{d.name}</Link> — {LEAD_STATUS_LABELS[d.status]} — {formatDateTime(d.createdAt)}</li>)}
          </ul>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Panel title="بيانات العميل">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {facts.map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5 break-words">{v}</dd></div>)}
            </dl>
            {lead.message && <p className="mt-4 whitespace-pre-line rounded-lg bg-beige-50 p-3 text-sm">{lead.message}</p>}
            {lead.chats.length > 0 && can(user.role, "assistant.conversations.view") && (
              <p className="mt-3 text-sm">محادثة المساعد: {lead.chats.map((c) => <Link key={c.id} href={`/admin/assistant/conversations/${c.id}`} className="text-navy underline">عرض</Link>)}</p>
            )}
          </Panel>

          <Panel title="الملاحظات الداخلية">
            {canManage && (
              <ActionForm action={addLeadNote} resetOnSuccess className="mb-4 space-y-2">
                <input type="hidden" name="id" value={lead.id} />
                <TextArea name="body" label="ملاحظة جديدة" rows={3} maxLength={4000} />
                <SubmitButton variant="outline">إضافة ملاحظة</SubmitButton>
              </ActionForm>
            )}
            <ul className="space-y-3">
              {lead.notes.map((n) => (
                <li key={n.id} className="rounded-lg border border-line p-3 text-sm">
                  <p className="whitespace-pre-line">{n.body}</p>
                  <p className="mt-2 text-xs text-muted">{n.author?.name ?? "—"} · {formatDateTime(n.createdAt)}</p>
                </li>
              ))}
              {!lead.notes.length && <li className="text-sm text-muted">لا توجد ملاحظات.</li>}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          {canManage && (
            <Panel title="مرحلة البيع">
              <ActionForm action={updateLeadStatus} className="space-y-3">
                <input type="hidden" name="id" value={lead.id} />
                <SelectField name="status" label="الحالة" defaultValue={lead.status} options={options(LEAD_STATUS_LABELS)} />
                <SubmitButton className="w-full">تحديث الحالة</SubmitButton>
              </ActionForm>
            </Panel>
          )}
          <Panel title="الإسناد">
            <p className="mb-3 text-sm">المسؤول الحالي: <strong>{lead.assignedTo?.name ?? "غير مُسند"}</strong></p>
            {canAssign ? (
              <ActionForm action={assignLead} className="space-y-3">
                <input type="hidden" name="id" value={lead.id} />
                <SelectField name="assigneeId" label="إسناد إلى" defaultValue={lead.assignedTo?.id} placeholder="— بدون —" options={agents.map((a) => ({ value: a.id, label: a.name }))} />
                <SubmitButton variant="outline" className="w-full">حفظ الإسناد</SubmitButton>
              </ActionForm>
            ) : (
              !lead.assignedTo && canManage && (
                <ActionForm action={assignLead}>
                  <input type="hidden" name="id" value={lead.id} />
                  <input type="hidden" name="assigneeId" value={user.id} />
                  <SubmitButton variant="outline" className="w-full">استلام العميل</SubmitButton>
                </ActionForm>
              )
            )}
          </Panel>
          <Panel title="سجل النشاط">
            <ol className="space-y-2 text-xs">
              {lead.activities.map((a) => (
                <li key={a.id} className="border-s-2 border-sand ps-3">
                  <span className="font-medium">{ACTIVITY[a.type] ?? a.type}</span>
                  {a.type === "status" && <> : {LEAD_STATUS_LABELS[a.fromValue as keyof typeof LEAD_STATUS_LABELS] ?? a.fromValue} ← {LEAD_STATUS_LABELS[a.toValue as keyof typeof LEAD_STATUS_LABELS] ?? a.toValue}</>}
                  <span className="block text-muted">{a.actor?.name ?? "النظام"} · {formatDateTime(a.createdAt)}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}

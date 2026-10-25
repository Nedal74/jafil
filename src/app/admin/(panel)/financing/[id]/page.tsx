import { notFound } from "next/navigation";

import { ActionForm, ConfirmAction, SelectField, SubmitButton, TextArea } from "@/components/admin/forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { EMPLOYER_LABELS, FIN_OP_LABELS, FIN_STATUS_LABELS, options } from "@/lib/admin/labels";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { displaySaudiMobile } from "@/lib/phone";
import { addFinancingNote, deleteFinancing, updateFinancing } from "../actions";

export const metadata = { title: "طلب تمويل" };

export default async function FinancingDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("financing.view");
  const { id } = await params;
  const [app, staff] = await Promise.all([
    prisma.financingApplication.findUnique({
      where: { id },
      include: { assignedTo: { select: { id: true, name: true } }, notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } } },
    }),
    prisma.user.findMany({ where: { active: true, role: { in: ["FINANCING_MANAGER", "SUPER_ADMIN"] } }, select: { id: true, name: true } }),
  ]);
  if (!app) notFound();
  const canManage = can(user.role, "financing.manage");
  const sar = (n: number) => `${formatNumber(n, "ar")} ريال`;
  const facts: [string, React.ReactNode][] = [
    ["الرقم المرجعي", <span key="r" dir="ltr">{app.reference}</span>],
    ["الجوال", <span key="p" dir="ltr">{displaySaudiMobile(app.phoneNormalized)}</span>],
    ["العملية", FIN_OP_LABELS[app.operation]],
    ["جهة العمل", EMPLOYER_LABELS[app.employerSector]],
    ["الراتب الشهري", sar(app.monthlySalary)],
    ["الالتزامات الشهرية", sar(app.monthlyObligations)],
    ["بنك الإيداع", app.bank],
    ["قرض عقاري قائم", app.hasRealEstateLoan ? "نعم" : "لا"],
    ["العمر", app.age],
    ["الموافقة", `نعم — ${formatDateTime(app.consentAt)}`],
    ["تاريخ الطلب", formatDateTime(app.createdAt)],
  ];
  return (
    <>
      <PageHeader title={app.fullName} description="لا يتخذ النظام قراراً آلياً بشأن الأهلية؛ التقييم مسؤولية المختص والجهة التمويلية." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Panel title="بيانات الطلب">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {facts.map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5">{v}</dd></div>)}
            </dl>
          </Panel>
          <Panel title="الملاحظات الداخلية">
            {canManage && (
              <ActionForm action={addFinancingNote} resetOnSuccess className="mb-4 space-y-2">
                <input type="hidden" name="id" value={app.id} />
                <TextArea name="body" label="ملاحظة جديدة" rows={3} />
                <SubmitButton variant="outline">إضافة</SubmitButton>
              </ActionForm>
            )}
            <ul className="space-y-3">
              {app.notes.map((n) => (
                <li key={n.id} className="rounded-lg border border-line p-3 text-sm">
                  <p className="whitespace-pre-line">{n.body}</p>
                  <p className="mt-2 text-xs text-muted">{n.author?.name ?? "—"} · {formatDateTime(n.createdAt)}</p>
                </li>
              ))}
              {!app.notes.length && <li className="text-sm text-muted">لا توجد ملاحظات.</li>}
            </ul>
          </Panel>
        </div>
        {canManage && (
          <div className="space-y-6">
            <Panel title="الحالة والإسناد">
              <ActionForm action={updateFinancing} className="space-y-3">
                <input type="hidden" name="id" value={app.id} />
                <SelectField name="status" label="الحالة" defaultValue={app.status} options={options(FIN_STATUS_LABELS)} />
                <SelectField name="assignedToId" label="المسؤول" defaultValue={app.assignedTo?.id} placeholder="— بدون —" options={staff.map((s) => ({ value: s.id, label: s.name }))} />
                <SubmitButton className="w-full">حفظ</SubmitButton>
              </ActionForm>
            </Panel>
            <Panel title="حذف البيانات">
              <p className="mb-3 text-xs text-muted">استخدمه عند طلب العميل حذف بياناته أو انتهاء مدة الاحتفاظ.</p>
              <ConfirmAction action={deleteFinancing} label="حذف الطلب نهائياً" fields={{ id: app.id }} confirm="سيُحذف الطلب وملاحظاته نهائياً ويُسجل ذلك في سجل التدقيق." />
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}

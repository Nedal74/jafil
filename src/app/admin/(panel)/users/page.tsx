import { ActionForm, Checkbox, SelectField, SubmitButton, TextField } from "@/components/admin/forms";
import { Badge, PageHeader, Panel } from "@/components/admin/ui";
import { PERMISSIONS, can, ROLE_LABELS } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { createUser, updateUser } from "./actions";

export const metadata = { title: "المستخدمون والصلاحيات" };

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }));

export default async function UsersPage() {
  const me = await requireUser("users.manage");
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageHeader title="المستخدمون والصلاحيات" description="تُطبق الصلاحيات على الخادم لكل إجراء. تغيير الدور أو كلمة المرور يُنهي جلسات المستخدم." />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <ul className="space-y-3">
          {users.map((u) => (
            <li key={u.id} className="rounded-xl border border-line bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <strong className="text-navy">{u.email}</strong>
                <Badge tone={u.active ? "green" : "gray"}>{u.active ? "نشط" : "معطّل"}</Badge>
                {u.id === me.id && <Badge tone="sand">أنت</Badge>}
                <span className="text-xs text-muted">آخر دخول: {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}</span>
              </div>
              <ActionForm action={updateUser} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <input type="hidden" name="id" value={u.id} />
                <TextField name="name" label="الاسم" defaultValue={u.name} />
                <SelectField name="role" label="الدور" defaultValue={u.role} options={ROLE_OPTIONS} />
                <TextField name="password" label="كلمة مرور جديدة (اختياري)" type="password" dir="ltr" autoComplete="new-password" />
                <SubmitButton variant="outline" className="py-2">حفظ</SubmitButton>
                <Checkbox name="active" label="الحساب نشط" defaultChecked={u.active} />
              </ActionForm>
            </li>
          ))}
        </ul>
        <div className="space-y-6">
          <Panel title="مستخدم جديد">
            <ActionForm action={createUser} resetOnSuccess className="space-y-3">
              <TextField name="name" label="الاسم" required />
              <TextField name="email" label="البريد" type="email" dir="ltr" required autoComplete="off" />
              <SelectField name="role" label="الدور" defaultValue="SALES_AGENT" options={ROLE_OPTIONS} />
              <TextField name="password" label="كلمة المرور المؤقتة" type="password" dir="ltr" required hint="10 أحرف على الأقل، حروف وأرقام" autoComplete="new-password" />
              <SubmitButton className="w-full">إنشاء</SubmitButton>
            </ActionForm>
          </Panel>
          <Panel title="مصفوفة الصلاحيات">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead><tr><th className="text-start">الصلاحية</th>{ROLE_OPTIONS.map((r) => <th key={r.value} className="px-1">{r.label}</th>)}</tr></thead>
                <tbody>
                  {PERMISSIONS.map((p) => (
                    <tr key={p} className="border-t border-line">
                      <td className="py-1" dir="ltr">{p}</td>
                      {ROLE_OPTIONS.map((r) => <td key={r.value} className="text-center">{can(r.value, p) ? "✓" : "—"}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

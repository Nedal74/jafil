import { ActionForm, Checkbox, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createManualLead } from "../actions";

export const metadata = { title: "عميل جديد" };

export default async function NewLead() {
  await requireUser("leads.manage");
  const [projects, types] = await Promise.all([
    prisma.project.findMany({ where: { status: "PUBLISHED" }, select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } }),
    prisma.propertyType.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="إضافة عميل يدوياً" description="للعملاء القادمين عبر الهاتف أو الزيارة. يتم فحص التكرار تلقائياً." />
      <Panel>
        <ActionForm action={createManualLead} className="grid gap-4 md:grid-cols-2">
          <TextField name="name" label="الاسم" required />
          <TextField name="phone" label="الجوال" required dir="ltr" placeholder="05XXXXXXXX" />
          <TextField name="email" label="البريد (اختياري)" dir="ltr" type="email" />
          <SelectField name="projectId" label="المشروع" placeholder="—" options={projects.map((p) => ({ value: p.id, label: p.nameAr }))} />
          <SelectField name="propertyTypeKey" label="نوع العقار" placeholder="—" options={types.map((t) => ({ value: t.key, label: t.nameAr }))} />
          <TextField name="preferredLocation" label="الموقع المفضل" />
          <TextField name="budgetMax" label="الميزانية القصوى" inputMode="numeric" dir="ltr" />
          <TextField name="bedrooms" label="عدد الغرف" inputMode="numeric" />
          <TextArea name="message" label="ملاحظات" className="md:col-span-2" />
          <div className="md:col-span-2"><Checkbox name="consent" label="أكد العميل موافقته على التواصل وحفظ بياناته" /></div>
          <div className="md:col-span-2"><SubmitButton>حفظ العميل</SubmitButton></div>
        </ActionForm>
      </Panel>
    </>
  );
}

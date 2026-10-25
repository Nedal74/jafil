import { ActionForm, Checkbox, ConfirmAction, SubmitButton, TextField } from "@/components/admin/forms";
import { Badge, PageHeader, Panel } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { deletePropertyType, savePropertyType } from "./actions";

export const metadata = { title: "أنواع العقار" };

export default async function PropertyTypes() {
  await requireUser("projects.manage");
  const types = await prisma.propertyType.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { projects: true, units: true } } } });
  return (
    <>
      <PageHeader title="أنواع العقار" description="الأنواع المتاحة للمشاريع والوحدات والبحث والمساعد العقاري. المفتاح يُستخدم في الروابط والفلترة." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ul className="space-y-3">
          {types.map((t) => (
            <li key={t.id} className="rounded-xl border border-line bg-white p-4">
              <ActionForm action={savePropertyType} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_80px_auto]">
                <input type="hidden" name="id" value={t.id} />
                <TextField name="key" label="المفتاح" defaultValue={t.key} dir="ltr" />
                <TextField name="nameAr" label="الاسم (عربي)" defaultValue={t.nameAr} />
                <TextField name="nameEn" label="الاسم (إنجليزي)" defaultValue={t.nameEn} dir="ltr" />
                <TextField name="order" label="الترتيب" defaultValue={t.order} inputMode="numeric" />
                <SubmitButton variant="outline" className="py-2">حفظ</SubmitButton>
                <div className="flex items-center gap-4 sm:col-span-5">
                  <Checkbox name="active" label="مفعّل" defaultChecked={t.active} />
                  <Badge>{t._count.projects} مشروع · {t._count.units} وحدة</Badge>
                </div>
              </ActionForm>
              <div className="mt-2"><ConfirmAction action={deletePropertyType} label="حذف" variant="link" fields={{ id: t.id }} confirm={`حذف النوع "${t.nameAr}"؟`} /></div>
            </li>
          ))}
          {!types.length && <li className="text-sm text-muted">لا توجد أنواع بعد.</li>}
        </ul>
        <Panel title="إضافة نوع">
          <ActionForm action={savePropertyType} resetOnSuccess className="space-y-3">
            <TextField name="key" label="المفتاح" dir="ltr" placeholder="villa" required />
            <TextField name="nameAr" label="الاسم (عربي)" required />
            <TextField name="nameEn" label="الاسم (إنجليزي)" dir="ltr" required />
            <TextField name="order" label="الترتيب" defaultValue={types.length} inputMode="numeric" />
            <Checkbox name="active" label="مفعّل" defaultChecked />
            <SubmitButton className="w-full">إضافة</SubmitButton>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}

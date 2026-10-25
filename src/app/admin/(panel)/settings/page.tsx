import { ActionForm, Checkbox, SubmitButton, TextArea, TextField } from "@/components/admin/forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { getSetting } from "@/lib/settings";
import { saveSettingAction } from "../content-actions";

export const metadata = { title: "إعدادات الموقع" };

export default async function SettingsPage() {
  await requireUser("settings.manage");
  const [fin, inv, privacy] = await Promise.all([getSetting("financing"), getSetting("inventory"), getSetting("privacy")]);
  return (
    <>
      <PageHeader title="إعدادات الموقع والتوطين" description="اللغات المدعومة: العربية (افتراضية، من اليمين لليسار) والإنجليزية. نصوص الواجهة الثابتة مترجمة في الشيفرة؛ المحتوى يُدار من اللوحة." />
      <div className="space-y-6">
        <Panel title="حساب نسبة المبيعات">
          <ActionForm action={saveSettingAction} className="space-y-3">
            <input type="hidden" name="__key" value="inventory" />
            <Checkbox name="countReservedAsSold" label="احتساب الوحدات المحجوزة ضمن المباعة في نسبة المبيعات" defaultChecked={inv.countReservedAsSold} hint="المقام يُحدد لكل مشروع: الوحدات المسجلة (عدا غير المنشورة) أو إجمالي مخزون يدوي." />
            <SubmitButton variant="outline">حفظ</SubmitButton>
          </ActionForm>
        </Panel>
        <Panel title="طلبات التمويل">
          <ActionForm action={saveSettingAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="__key" value="financing" />
            <TextArea name="banks" label="قائمة البنوك (سطر لكل بنك: الاسم العربي | English name)" rows={12} defaultValue={fin.banks.map((b) => `${b.ar} | ${b.en}`).join("\n")} />
            <div>
              <TextField name="retentionDays" label="مدة الاحتفاظ المرجعية بطلبات التمويل (يوم)" defaultValue={fin.retentionDays} inputMode="numeric" hint="مرجع لسياسة الاحتفاظ؛ الحذف يتم من صفحة الطلب أو عبر سكربت التنظيف (انظر README)." />
            </div>
            <div className="md:col-span-2"><SubmitButton variant="outline">حفظ</SubmitButton></div>
          </ActionForm>
        </Panel>
        <Panel title="سياسة الخصوصية">
          <ActionForm action={saveSettingAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="__key" value="privacy" />
            <TextArea name="contentAr" label="النص (عربي)" defaultValue={privacy.contentAr} rows={16} hint="اتركه فارغاً لعرض السياسة الأساسية المدمجة. يُنصح بمراجعتها قانونياً وفق نظام حماية البيانات الشخصية." />
            <TextArea name="contentEn" label="النص (إنجليزي)" defaultValue={privacy.contentEn} rows={16} dir="ltr" />
            <div className="md:col-span-2"><SubmitButton variant="outline">حفظ</SubmitButton></div>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}

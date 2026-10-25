import { ActionForm, SubmitButton, TextArea, TextField } from "@/components/admin/forms";
import { MediaUrlField } from "@/components/admin/MediaUrlField";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { getSetting } from "@/lib/settings";
import { saveSettingAction } from "../content-actions";

export const metadata = { title: "الشركة وكلمة الرئيس" };

export default async function CompanyPage() {
  await requireUser("content.manage");
  const [c, ch] = await Promise.all([getSetting("company"), getSetting("chairman")]);
  return (
    <>
      <PageHeader title="الشركة وكلمة رئيس مجلس الإدارة" description="تظهر في الصفحة الرئيسية وصفحة من نحن. الأقسام الفارغة لا تظهر في الموقع." />
      <div className="space-y-6">
        <Panel title="ملف الشركة">
          <ActionForm action={saveSettingAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="__key" value="company" />
            <TextField name="nameAr" label="اسم الشركة (عربي)" defaultValue={c.nameAr} />
            <TextField name="nameEn" label="اسم الشركة (إنجليزي)" defaultValue={c.nameEn} dir="ltr" />
            <TextArea name="introAr" label="نبذة الصفحة الرئيسية (عربي)" defaultValue={c.introAr} rows={4} />
            <TextArea name="introEn" label="نبذة الصفحة الرئيسية (إنجليزي)" defaultValue={c.introEn} rows={4} dir="ltr" />
            <TextArea name="aboutAr" label="من نحن — النص الكامل (عربي)" defaultValue={c.aboutAr} rows={8} />
            <TextArea name="aboutEn" label="من نحن — النص الكامل (إنجليزي)" defaultValue={c.aboutEn} rows={8} dir="ltr" />
            <TextArea name="visionAr" label="الرؤية (عربي)" defaultValue={c.visionAr} rows={3} />
            <TextArea name="visionEn" label="الرؤية (إنجليزي)" defaultValue={c.visionEn} rows={3} dir="ltr" />
            <TextArea name="missionAr" label="الرسالة (عربي)" defaultValue={c.missionAr} rows={3} />
            <TextArea name="missionEn" label="الرسالة (إنجليزي)" defaultValue={c.missionEn} rows={3} dir="ltr" />
            <TextArea name="valuesAr" label="القيم (عربي)" defaultValue={c.valuesAr} rows={3} />
            <TextArea name="valuesEn" label="القيم (إنجليزي)" defaultValue={c.valuesEn} rows={3} dir="ltr" />
            <div className="md:col-span-2"><SubmitButton>حفظ ملف الشركة</SubmitButton></div>
          </ActionForm>
        </Panel>
        <Panel title="كلمة رئيس مجلس الإدارة">
          <ActionForm action={saveSettingAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="__key" value="chairman" />
            <TextField name="nameAr" label="الاسم (عربي)" defaultValue={ch.nameAr} />
            <TextField name="nameEn" label="الاسم (إنجليزي)" defaultValue={ch.nameEn} dir="ltr" />
            <TextField name="titleAr" label="المنصب (عربي)" defaultValue={ch.titleAr} />
            <TextField name="titleEn" label="المنصب (إنجليزي)" defaultValue={ch.titleEn} dir="ltr" />
            <TextArea name="messageAr" label="الكلمة (عربي)" defaultValue={ch.messageAr} rows={8} />
            <TextArea name="messageEn" label="الكلمة (إنجليزي)" defaultValue={ch.messageEn} rows={8} dir="ltr" />
            <MediaUrlField name="photoUrl" label="الصورة (اختياري)" defaultValue={ch.photoUrl} />
            <MediaUrlField name="signatureUrl" label="التوقيع (اختياري)" defaultValue={ch.signatureUrl} />
            <div className="md:col-span-2"><SubmitButton>حفظ الكلمة</SubmitButton></div>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}

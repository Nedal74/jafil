import { ActionForm, SubmitButton, TextArea, TextField } from "@/components/admin/forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { getSetting } from "@/lib/settings";
import { saveSettingAction } from "../content-actions";

export const metadata = { title: "التواصل والشبكات" };

export default async function ContactSettings() {
  await requireUser("content.manage");
  const c = await getSetting("contact");
  return (
    <>
      <PageHeader title="بيانات التواصل والشبكات الاجتماعية" description="تظهر في الترويسة والتذييل وصفحة التواصل وأزرار واتساب." />
      <Panel>
        <ActionForm action={saveSettingAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="__key" value="contact" />
          <TextField name="email" label="البريد الإلكتروني" defaultValue={c.email} dir="ltr" type="email" />
          <TextField name="whatsapp" label="رقم واتساب" defaultValue={c.whatsapp} dir="ltr" />
          <TextArea name="phones" label="أرقام الهاتف (رقم في كل سطر)" defaultValue={c.phones.join("\n")} rows={3} dir="ltr" />
          <TextField name="mapUrl" label="رابط الخريطة" defaultValue={c.mapUrl} dir="ltr" />
          <TextField name="addressAr" label="العنوان (عربي)" defaultValue={c.addressAr} />
          <TextField name="addressEn" label="العنوان (إنجليزي)" defaultValue={c.addressEn} dir="ltr" />
          <TextField name="workingHoursAr" label="ساعات العمل (عربي)" defaultValue={c.workingHoursAr} />
          <TextField name="workingHoursEn" label="ساعات العمل (إنجليزي)" defaultValue={c.workingHoursEn} dir="ltr" />
          <h3 className="pt-2 font-semibold text-navy md:col-span-2">الشبكات الاجتماعية (روابط كاملة https://)</h3>
          {(["x", "instagram", "snapchat", "tiktok", "linkedin", "youtube"] as const).map((k) => (
            <TextField key={k} name={`socials.${k}`} label={k} defaultValue={c.socials[k]} dir="ltr" />
          ))}
          <div className="md:col-span-2"><SubmitButton>حفظ</SubmitButton></div>
        </ActionForm>
      </Panel>
    </>
  );
}

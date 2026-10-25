import Link from "next/link";

import { ActionForm, Checkbox, ConfirmAction, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/forms";
import { Badge, PageHeader, Panel } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getHomeSections, HOME_SECTION_LABELS } from "@/lib/home-sections";
import {
  deleteAdvantage, deleteStat, moveHomeSection, saveAdvantage, saveHomeSection, saveStat, toggleHomeSection,
} from "../content-actions";

export const metadata = { title: "الصفحة الرئيسية" };

const ICONS = ["check", "shield", "award", "gem", "key", "home", "clock", "handshake", "sparkles", "building"].map((v) => ({ value: v, label: v }));

const SOURCE_NOTE: Record<string, string> = {
  hero: "يعرض المشاريع المنشورة المعلّمة «تظهر في واجهة الرئيسية».",
  featured: "يعرض المشاريع المنشورة المعلّمة «مميز».",
  current: "يعرض المشاريع المنشورة القادمة وتحت الإنشاء.",
  completed: "يعرض المشاريع المكتملة؛ يُخفى إن لم توجد.",
  intro: "النص من صفحة «الشركة وكلمة الرئيس».",
  chairman: "النص والصورة من صفحة «الشركة وكلمة الرئيس».",
  stats: "الأرقام من القسم أدناه.",
  advantages: "العناصر من القسم أدناه.",
  news: "آخر 3 مقالات منشورة.",
};

export default async function HomepageEditor() {
  await requireUser("content.manage");
  const [sections, stats, advantages] = await Promise.all([
    getHomeSections(),
    prisma.companyStat.findMany({ orderBy: { order: "asc" } }),
    prisma.advantage.findMany({ orderBy: { order: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="الصفحة الرئيسية" description="فعّل الأقسام أو أخفها، رتّبها، وعدّل عناوينها. المحتوى يأتي من البيانات الحقيقية المنشورة." actions={<Link href="/ar" target="_blank" className="btn-outline">معاينة ↗</Link>} />
      <ol className="space-y-3">
        {sections.map((s, i) => (
          <li key={s.key} className="rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-beige text-xs font-semibold text-sand-700">{i + 1}</span>
                <span className="font-medium text-navy">{HOME_SECTION_LABELS[s.key]}</span>
                <Badge tone={s.enabled ? "green" : "gray"}>{s.enabled ? "ظاهر" : "مخفي"}</Badge>
              </span>
              <span className="flex items-center gap-2">
                <ConfirmAction action={moveHomeSection} label="↑ أعلى" variant="outline" fields={{ key: s.key, dir: "up" }} />
                <ConfirmAction action={moveHomeSection} label="↓ أسفل" variant="outline" fields={{ key: s.key, dir: "down" }} />
                <ConfirmAction action={toggleHomeSection} label={s.enabled ? "إخفاء" : "إظهار"} variant="outline" fields={{ key: s.key }} />
              </span>
            </div>
            <details>
              <summary className="cursor-pointer border-t border-line px-4 py-2 text-sm text-navy">تعديل العناوين</summary>
              <div className="border-t border-line p-4">
                {SOURCE_NOTE[s.key] && <p className="mb-3 text-xs text-muted">{SOURCE_NOTE[s.key]}</p>}
                <ActionForm action={saveHomeSection} className="grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="key" value={s.key} />
                  <input type="hidden" name="order" value={s.order} />
                  <TextField name="titleAr" label="العنوان (عربي)" defaultValue={s.titleAr} hint="اتركه فارغاً لاستخدام العنوان الافتراضي" />
                  <TextField name="titleEn" label="العنوان (إنجليزي)" defaultValue={s.titleEn} dir="ltr" />
                  <TextArea name="subtitleAr" label="النص الفرعي (عربي)" defaultValue={s.subtitleAr} rows={2} />
                  <TextArea name="subtitleEn" label="النص الفرعي (إنجليزي)" defaultValue={s.subtitleEn} rows={2} dir="ltr" />
                  <Checkbox name="enabled" label="القسم ظاهر" defaultChecked={s.enabled} />
                  <div className="md:col-span-2"><SubmitButton variant="outline">حفظ القسم</SubmitButton></div>
                </ActionForm>
              </div>
            </details>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel title="إحصائيات الشركة">
          <p className="mb-3 text-xs text-muted">أدخل أرقاماً موثقة فقط. يُخفى القسم إن لم توجد أرقام مفعّلة.</p>
          <ul className="space-y-3">
            {stats.map((st) => (
              <li key={st.id} className="rounded-lg border border-line p-3">
                <ActionForm action={saveStat} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input type="hidden" name="id" value={st.id} />
                  <TextField name="labelAr" label="الوصف (عربي)" defaultValue={st.labelAr} />
                  <TextField name="labelEn" label="الوصف (إنجليزي)" defaultValue={st.labelEn} dir="ltr" />
                  <TextField name="value" label="القيمة" defaultValue={st.value} inputMode="numeric" />
                  <TextField name="suffix" label="لاحقة" defaultValue={st.suffix} placeholder="+" />
                  <input type="hidden" name="prefix" value={st.prefix ?? ""} />
                  <TextField name="order" label="الترتيب" defaultValue={st.order} />
                  <div className="col-span-2 flex items-end gap-3 sm:col-span-3"><Checkbox name="enabled" label="ظاهر" defaultChecked={st.enabled} /><SubmitButton variant="outline" className="py-1.5 text-xs">حفظ</SubmitButton></div>
                </ActionForm>
                <ConfirmAction action={deleteStat} label="حذف" variant="link" fields={{ id: st.id }} confirm="حذف هذا الرقم؟" />
              </li>
            ))}
          </ul>
          <ActionForm action={saveStat} resetOnSuccess className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 sm:grid-cols-4">
            <TextField name="labelAr" label="الوصف (عربي)" />
            <TextField name="labelEn" label="الوصف (إنجليزي)" dir="ltr" />
            <TextField name="value" label="القيمة" inputMode="numeric" />
            <TextField name="suffix" label="لاحقة" />
            <input type="hidden" name="order" value={stats.length} />
            <input type="hidden" name="enabled" value="on" />
            <div className="col-span-2 sm:col-span-4"><SubmitButton variant="outline">إضافة رقم</SubmitButton></div>
          </ActionForm>
        </Panel>

        <Panel title="المزايا والضمانات العامة">
          <ul className="space-y-3">
            {advantages.map((a) => (
              <li key={a.id} className="rounded-lg border border-line p-3">
                <ActionForm action={saveAdvantage} className="grid gap-2 sm:grid-cols-2">
                  <input type="hidden" name="id" value={a.id} />
                  <TextField name="titleAr" label="العنوان (عربي)" defaultValue={a.titleAr} />
                  <TextField name="titleEn" label="العنوان (إنجليزي)" defaultValue={a.titleEn} dir="ltr" />
                  <TextArea name="descriptionAr" label="الوصف (عربي)" defaultValue={a.descriptionAr} rows={2} />
                  <TextArea name="descriptionEn" label="الوصف (إنجليزي)" defaultValue={a.descriptionEn} rows={2} dir="ltr" />
                  <SelectField name="icon" label="الأيقونة" defaultValue={a.icon} options={ICONS} />
                  <TextField name="order" label="الترتيب" defaultValue={a.order} />
                  <div className="flex items-end gap-3 sm:col-span-2"><Checkbox name="enabled" label="ظاهر" defaultChecked={a.enabled} /><SubmitButton variant="outline" className="py-1.5 text-xs">حفظ</SubmitButton></div>
                </ActionForm>
                <ConfirmAction action={deleteAdvantage} label="حذف" variant="link" fields={{ id: a.id }} confirm="حذف هذه الميزة؟" />
              </li>
            ))}
          </ul>
          <ActionForm action={saveAdvantage} resetOnSuccess className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
            <TextField name="titleAr" label="العنوان (عربي)" />
            <TextField name="titleEn" label="العنوان (إنجليزي)" dir="ltr" />
            <TextArea name="descriptionAr" label="الوصف (عربي)" rows={2} />
            <TextArea name="descriptionEn" label="الوصف (إنجليزي)" rows={2} dir="ltr" />
            <SelectField name="icon" label="الأيقونة" defaultValue="check" options={ICONS} />
            <input type="hidden" name="order" value={advantages.length} />
            <input type="hidden" name="enabled" value="on" />
            <div className="sm:col-span-2"><SubmitButton variant="outline">إضافة ميزة</SubmitButton></div>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}

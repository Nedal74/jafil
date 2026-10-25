import type { Media, Project, PropertyType } from "@prisma/client";

import { ActionForm, Checkbox, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/forms";
import { MediaField } from "@/components/admin/MediaField";
import { Panel } from "@/components/admin/ui";
import { CONSTRUCTION_LABELS, options, PUBLISH_LABELS, SALES_LABELS } from "@/lib/admin/labels";
import { saveProject } from "./actions";

type P = Project & { coverImage: Media | null; ogImage: Media | null };

export function ProjectForm({ project, types }: { project?: P | null; types: PropertyType[] }) {
  const v = project;
  return (
    <ActionForm action={saveProject} className="space-y-6">
      {v && <input type="hidden" name="id" value={v.id} />}
      <Panel title="البيانات الأساسية">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="nameAr" label="اسم المشروع (عربي)" defaultValue={v?.nameAr} required maxLength={150} />
          <TextField name="nameEn" label="اسم المشروع (إنجليزي)" defaultValue={v?.nameEn} required dir="ltr" maxLength={150} />
          <TextField name="slugAr" label="الرابط المختصر (عربي)" defaultValue={v?.slugAr} hint="يُولّد تلقائياً من الاسم إن تُرك فارغاً. تغييره لمشروع منشور ينشئ تحويلاً تلقائياً." />
          <TextField name="slugEn" label="الرابط المختصر (إنجليزي)" defaultValue={v?.slugEn} dir="ltr" hint="مثال: al-narjis-floors" />
          <TextArea name="summaryAr" label="نبذة مختصرة (عربي)" defaultValue={v?.summaryAr} rows={3} maxLength={600} />
          <TextArea name="summaryEn" label="نبذة مختصرة (إنجليزي)" defaultValue={v?.summaryEn} rows={3} dir="ltr" maxLength={600} />
          <TextArea name="descriptionAr" label="الوصف التفصيلي (عربي)" defaultValue={v?.descriptionAr} rows={7} />
          <TextArea name="descriptionEn" label="الوصف التفصيلي (إنجليزي)" defaultValue={v?.descriptionEn} rows={7} dir="ltr" />
        </div>
      </Panel>

      <Panel title="الحالة والتصنيف">
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField name="status" label="حالة النشر" defaultValue={v?.status ?? "DRAFT"} options={options(PUBLISH_LABELS)} />
          <SelectField name="salesStatus" label="حالة البيع" defaultValue={v?.salesStatus ?? "COMING_SOON"} options={options(SALES_LABELS)} />
          <SelectField name="constructionStatus" label="حالة الإنشاء" defaultValue={v?.constructionStatus ?? "UPCOMING"} options={options(CONSTRUCTION_LABELS)} />
          <SelectField name="propertyTypeId" label="نوع العقار" defaultValue={v?.propertyTypeId} placeholder="— غير محدد —" options={types.map((t) => ({ value: t.id, label: t.nameAr }))} />
          <TextField name="displayOrder" label="ترتيب العرض" type="number" defaultValue={v?.displayOrder ?? 0} hint="الأصغر يظهر أولاً" />
          <div className="flex flex-col justify-end gap-2 pb-1">
            <Checkbox name="featured" label="مشروع مميز" defaultChecked={v?.featured} />
            <Checkbox name="showOnHome" label="يظهر في واجهة الصفحة الرئيسية" defaultChecked={v?.showOnHome} />
          </div>
        </div>
      </Panel>

      <Panel title="الموقع">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="cityAr" label="المدينة (عربي)" defaultValue={v?.cityAr} />
          <TextField name="cityEn" label="المدينة (إنجليزي)" defaultValue={v?.cityEn} dir="ltr" />
          <TextField name="neighborhoodAr" label="الحي (عربي)" defaultValue={v?.neighborhoodAr} />
          <TextField name="neighborhoodEn" label="الحي (إنجليزي)" defaultValue={v?.neighborhoodEn} dir="ltr" />
          <TextField name="addressAr" label="العنوان (عربي)" defaultValue={v?.addressAr} />
          <TextField name="addressEn" label="العنوان (إنجليزي)" defaultValue={v?.addressEn} dir="ltr" />
          <TextField name="latitude" label="خط العرض" defaultValue={v?.latitude} dir="ltr" inputMode="decimal" />
          <TextField name="longitude" label="خط الطول" defaultValue={v?.longitude} dir="ltr" inputMode="decimal" />
          <TextField name="mapUrl" label="رابط الخريطة" defaultValue={v?.mapUrl} dir="ltr" className="md:col-span-2" hint="رابط Google Maps للموقع الفعلي" />
        </div>
      </Panel>

      <Panel title="الأسعار والمساحات والمخزون">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            name="rangeMode"
            label="مصدر النطاقات المعروضة"
            defaultValue={v?.rangeMode ?? "AUTO_FROM_UNITS"}
            options={[{ value: "AUTO_FROM_UNITS", label: "تلقائي من الوحدات المسجلة (موصى به)" }, { value: "MANUAL", label: "إدخال يدوي" }]}
            hint="في الوضع التلقائي تُحسب النطاقات من الوحدات غير المخفية، ويُتجاهل الإدخال اليدوي أدناه."
          />
          <SelectField
            name="inventoryBasis"
            label="أساس حساب نسبة المبيعات"
            defaultValue={v?.inventoryBasis ?? "LISTED_UNITS"}
            options={[{ value: "LISTED_UNITS", label: "الوحدات المسجلة (عدا غير المنشورة)" }, { value: "MANUAL_TOTAL", label: "إجمالي مخزون يدوي" }]}
          />
          <TextField name="manualInventoryTotal" label="إجمالي المخزون (عند الإدخال اليدوي)" defaultValue={v?.manualInventoryTotal} inputMode="numeric" dir="ltr" />
          <div />
          <TextField name="priceMin" label="أقل سعر (ريال)" defaultValue={v?.priceMin} inputMode="numeric" dir="ltr" />
          <TextField name="priceMax" label="أعلى سعر (ريال)" defaultValue={v?.priceMax} inputMode="numeric" dir="ltr" />
          <TextField name="areaMin" label="أقل مساحة (م²)" defaultValue={v?.areaMin} inputMode="decimal" dir="ltr" />
          <TextField name="areaMax" label="أكبر مساحة (م²)" defaultValue={v?.areaMax} inputMode="decimal" dir="ltr" />
          <TextField name="bedroomsMin" label="أقل عدد غرف" defaultValue={v?.bedroomsMin} inputMode="numeric" dir="ltr" />
          <TextField name="bedroomsMax" label="أكثر عدد غرف" defaultValue={v?.bedroomsMax} inputMode="numeric" dir="ltr" />
          <TextField name="deliveryAr" label="معلومات التسليم (عربي)" defaultValue={v?.deliveryAr} hint="اتركه فارغاً إن لم يُعتمد موعد" />
          <TextField name="deliveryEn" label="معلومات التسليم (إنجليزي)" defaultValue={v?.deliveryEn} dir="ltr" />
        </div>
      </Panel>

      <Panel title="الوسائط والتواصل">
        <div className="grid gap-6 md:grid-cols-2">
          <MediaField name="coverImageId" label="صورة الغلاف" defaultValue={v?.coverImage} />
          <TextField name="videoUrl" label="رابط الفيديو (YouTube/Vimeo)" defaultValue={v?.videoUrl} dir="ltr" />
          <TextField name="salesPhone" label="هاتف المبيعات للمشروع" defaultValue={v?.salesPhone} dir="ltr" hint="يُستخدم هاتف الشركة إن تُرك فارغاً" />
          <TextField name="salesWhatsapp" label="واتساب المبيعات للمشروع" defaultValue={v?.salesWhatsapp} dir="ltr" />
        </div>
      </Panel>

      <Panel title="تحسين محركات البحث">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="seoTitleAr" label="عنوان SEO (عربي)" defaultValue={v?.seoTitleAr} maxLength={70} hint="حتى 60 حرفاً تقريباً" />
          <TextField name="seoTitleEn" label="عنوان SEO (إنجليزي)" defaultValue={v?.seoTitleEn} maxLength={70} dir="ltr" />
          <TextArea name="seoDescriptionAr" label="الوصف التعريفي (عربي)" defaultValue={v?.seoDescriptionAr} rows={2} maxLength={170} />
          <TextArea name="seoDescriptionEn" label="الوصف التعريفي (إنجليزي)" defaultValue={v?.seoDescriptionEn} rows={2} maxLength={170} dir="ltr" />
          <TextField name="canonicalUrl" label="الرابط القانوني (اختياري)" defaultValue={v?.canonicalUrl} dir="ltr" hint="اتركه فارغاً ليُستخدم رابط الصفحة نفسها" />
          <MediaField name="ogImageId" label="صورة المشاركة الاجتماعية" defaultValue={v?.ogImage} hint="تُستخدم صورة الغلاف إن لم تُحدد" />
        </div>
      </Panel>

      <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t border-line bg-[#f7f5f1]/95 px-1 py-3 backdrop-blur">
        <SubmitButton>{v ? "حفظ التعديلات" : "إنشاء المشروع"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

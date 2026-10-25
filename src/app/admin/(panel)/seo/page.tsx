import { ActionForm, Checkbox, ConfirmAction, SubmitButton, TextArea, TextField } from "@/components/admin/forms";
import { MediaUrlField } from "@/components/admin/MediaUrlField";
import { PageHeader, Panel, Table, Td } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { saveSettingAction } from "../content-actions";
import { deleteRedirect, saveRedirect } from "./actions";

export const metadata = { title: "تحسين محركات البحث" };

export default async function SeoPage() {
  await requireUser("seo.manage");
  const [seo, redirects, drafts, missingSeo] = await Promise.all([
    getSetting("seo"),
    prisma.redirect.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.project.count({ where: { status: "DRAFT" } }),
    prisma.project.count({ where: { status: "PUBLISHED", OR: [{ seoDescriptionAr: null }, { coverImageId: null }] } }),
  ]);
  const base = siteUrl();
  return (
    <>
      <PageHeader title="تحسين محركات البحث" description="لا يمكن ضمان الأرشفة الفورية أو ترتيب معين في Google؛ هذه الأدوات تجعل الموقع قابلاً للفهرسة بشكل سليم." />
      <div className="mb-6 grid gap-3 text-sm sm:grid-cols-3">
        <a className="rounded-xl border border-line bg-white p-4 hover:border-sand" href="/sitemap.xml" target="_blank">خريطة الموقع: <span dir="ltr">{base}/sitemap.xml</span></a>
        <a className="rounded-xl border border-line bg-white p-4 hover:border-sand" href="/robots.txt" target="_blank">ملف robots: <span dir="ltr">{base}/robots.txt</span></a>
        <div className="rounded-xl border border-line bg-white p-4">مسودات غير مفهرسة: {drafts} · مشاريع منشورة تنقصها بيانات SEO/غلاف: {missingSeo}</div>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="الإعدادات الافتراضية">
          <ActionForm action={saveSettingAction} className="space-y-3">
            <input type="hidden" name="__key" value="seo" />
            <TextField name="titleAr" label="عنوان الموقع (عربي)" defaultValue={seo.titleAr} />
            <TextField name="titleEn" label="عنوان الموقع (إنجليزي)" defaultValue={seo.titleEn} dir="ltr" />
            <TextArea name="descriptionAr" label="الوصف الافتراضي (عربي)" defaultValue={seo.descriptionAr} rows={2} />
            <TextArea name="descriptionEn" label="الوصف الافتراضي (إنجليزي)" defaultValue={seo.descriptionEn} rows={2} dir="ltr" />
            <MediaUrlField name="ogImageUrl" label="صورة المشاركة الافتراضية (1200×630)" defaultValue={seo.ogImageUrl} />
            <TextField name="searchConsoleVerification" label="رمز تحقق Google Search Console (وسم meta)" defaultValue={seo.searchConsoleVerification} dir="ltr" hint="القيمة داخل content فقط" />
            <Checkbox name="indexingEnabled" label="السماح لمحركات البحث بفهرسة الموقع" defaultChecked={seo.indexingEnabled} hint="عطّله في بيئة الاختبار؛ يغلق robots.txt ويضيف noindex." />
            <SubmitButton>حفظ</SubmitButton>
          </ActionForm>
        </Panel>
        <Panel title="التحويلات (Redirects)">
          <p className="mb-3 text-xs text-muted">تُنشأ تلقائياً عند تغيير رابط مشروع أو مقال منشور. يمكنك إضافة تحويلات يدوية (308 دائم).</p>
          <ActionForm action={saveRedirect} resetOnSuccess className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <TextField name="fromPath" label="من" dir="ltr" placeholder="/ar/old-page" />
            <TextField name="toPath" label="إلى" dir="ltr" placeholder="/ar/projects/new-slug" />
            <SubmitButton variant="outline" className="py-2">إضافة</SubmitButton>
          </ActionForm>
          <Table head={["من", "إلى", ""]} empty={redirects.length ? false : "لا توجد تحويلات"}>
            {redirects.map((r) => (
              <tr key={r.id}>
                <Td className="text-xs" ><span dir="ltr">{r.fromPath}</span></Td>
                <Td className="text-xs"><span dir="ltr">{r.toPath}</span></Td>
                <Td><ConfirmAction action={deleteRedirect} label="حذف" variant="link" fields={{ id: r.id }} confirm="حذف هذا التحويل؟" /></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </>
  );
}

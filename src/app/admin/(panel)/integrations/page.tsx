import { ActionForm, SubmitButton, TextField } from "@/components/admin/forms";
import { Badge, PageHeader, Panel, Table, Td } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { ga4EventCounts, googleCredentialsConfigured, searchConsoleTopQueries, type Ga4Row, type SearchRow } from "@/lib/google/client";
import { getSetting } from "@/lib/settings";
import { saveSettingAction } from "../content-actions";

export const metadata = { title: "تكاملات Google" };

const EVENTS: Record<string, string> = {
  project_view: "عرض مشروع",
  contact_form_submit: "إرسال نموذج تواصل",
  whatsapp_click: "نقرة واتساب",
  assistant_open: "فتح المساعد",
  qualified_lead_submit: "عميل مؤهل",
  financing_submit: "طلب تمويل",
  page_view: "مشاهدة صفحة",
};

export default async function IntegrationsPage() {
  await requireUser("integrations.manage");
  const g = await getSetting("google");
  const creds = googleCredentialsConfigured();
  let queries: SearchRow[] | null = null;
  let events: Ga4Row[] | null = null;
  let gscError: string | null = null;
  let gaError: string | null = null;
  if (creds && g.searchConsoleSiteUrl) {
    try { queries = await searchConsoleTopQueries(g.searchConsoleSiteUrl); } catch (e) { gscError = (e as Error).message; }
  }
  if (creds && g.ga4PropertyId) {
    try { events = await ga4EventCounts(g.ga4PropertyId); } catch (e) { gaError = (e as Error).message; }
  }
  const status = (okay: boolean, label: string) => <Badge tone={okay ? "green" : "gray"}>{okay ? `${label}: مفعّل` : `${label}: غير مُعد`}</Badge>;

  return (
    <>
      <PageHeader title="تكاملات Google" description="المعرّفات العامة تُحفظ هنا؛ بيانات اعتماد حساب الخدمة تبقى في متغيرات البيئة على الخادم فقط." />
      <div className="mb-6 flex flex-wrap gap-2">
        {status(Boolean(g.ga4MeasurementId), "GA4")}
        {status(Boolean(g.gtmContainerId), "Tag Manager")}
        {status(Boolean(g.searchConsoleSiteUrl), "Search Console")}
        {status(creds, "حساب الخدمة (قراءة التقارير)")}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="المعرفات">
          <ActionForm action={saveSettingAction} className="space-y-3">
            <input type="hidden" name="__key" value="google" />
            <TextField name="ga4MeasurementId" label="GA4 Measurement ID" defaultValue={g.ga4MeasurementId} dir="ltr" placeholder="G-XXXXXXXXXX" hint="يُحمّل فقط بعد موافقة الزائر على ملفات التحليل (Consent Mode v2)." />
            <TextField name="gtmContainerId" label="Google Tag Manager ID" defaultValue={g.gtmContainerId} dir="ltr" placeholder="GTM-XXXXXXX" hint="عند تعيينه يُستخدم GTM بدلاً من gtag المباشر؛ اضبط وسوم GA4 داخل GTM." />
            <TextField name="searchConsoleSiteUrl" label="خاصية Search Console" defaultValue={g.searchConsoleSiteUrl} dir="ltr" placeholder="sc-domain:aljafil.com أو https://aljafil.com/" />
            <TextField name="ga4PropertyId" label="GA4 Property ID (لقراءة التقارير)" defaultValue={g.ga4PropertyId} dir="ltr" placeholder="123456789" />
            <SubmitButton>حفظ</SubmitButton>
          </ActionForm>
        </Panel>
        <Panel title="خطوات الإعداد والصلاحيات">
          <ol className="list-decimal space-y-2 ps-5 text-sm leading-7">
            <li>تحقق من ملكية النطاق في <a className="text-navy underline" href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Search Console</a> (سجل DNS أو وسم meta من صفحة SEO)، ثم أرسل <span dir="ltr">/sitemap.xml</span>.</li>
            <li>أنشئ خاصية في <a className="text-navy underline" href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">Google Analytics</a> وانسخ Measurement ID، أو أنشئ حاوية في <a className="text-navy underline" href="https://tagmanager.google.com/" target="_blank" rel="noopener noreferrer">Tag Manager</a>.</li>
            <li>علّم الأحداث التالية كتحويلات في GA4: qualified_lead_submit، contact_form_submit، financing_submit، whatsapp_click.</li>
            <li>لعرض التقارير هنا: أنشئ حساب خدمة في Google Cloud، فعّل Search Console API وGoogle Analytics Data API، وأضف بريده كمستخدم (قراءة) في Search Console وكـ Viewer في GA4، ثم ضع <code dir="ltr">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> و<code dir="ltr">GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</code> في متغيرات بيئة الخادم.</li>
          </ol>
        </Panel>
        <Panel title="أكثر عبارات البحث (آخر 28 يوماً)">
          {!creds || !g.searchConsoleSiteUrl ? <p className="text-sm text-muted">غير مُعد بعد.</p> : gscError ? <p role="alert" className="text-sm text-red-700">تعذر جلب البيانات: {gscError}</p> : (
            <Table head={["العبارة", "النقرات", "الظهور", "متوسط الترتيب"]} empty={queries?.length ? false : "لا توجد بيانات بعد"}>
              {queries?.map((r) => <tr key={r.keys[0]}><Td>{r.keys[0]}</Td><Td>{r.clicks}</Td><Td>{r.impressions}</Td><Td>{r.position.toFixed(1)}</Td></tr>)}
            </Table>
          )}
        </Panel>
        <Panel title="أحداث التحويل في GA4 (آخر 28 يوماً)">
          {!creds || !g.ga4PropertyId ? <p className="text-sm text-muted">غير مُعد بعد.</p> : gaError ? <p role="alert" className="text-sm text-red-700">تعذر جلب البيانات: {gaError}</p> : (
            <Table head={["الحدث", "العدد"]} empty={events?.length ? false : "لا توجد بيانات بعد"}>
              {events?.map((r) => <tr key={r.event}><Td>{EVENTS[r.event] ?? r.event}</Td><Td>{r.count}</Td></tr>)}
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}

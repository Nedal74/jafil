import type { Locale } from "./i18n/config";

/**
 * Baseline policy describing what this website actually collects. Shown until an
 * administrator publishes the company's reviewed policy from the dashboard.
 * It should be reviewed against the Saudi Personal Data Protection Law (PDPL).
 */
export const DEFAULT_PRIVACY: Record<Locale, string> = {
  ar: `تلتزم مساكن الجافل العقارية بحماية بياناتك الشخصية. توضح هذه السياسة البيانات التي نجمعها عبر هذا الموقع وكيفية استخدامها.

## البيانات التي نجمعها
- بيانات التواصل التي تُدخلها في نماذج الاستفسار والتواصل (الاسم، رقم الجوال، البريد الإلكتروني الاختياري، ورسالتك).
- بيانات طلب التمويل التي تُدخلها طوعاً (نوع العملية، الراتب، جهة العمل، بنك الإيداع، الالتزامات، وجود قرض عقاري، العمر).
- تفضيلات البحث التي تشاركها مع المساعد العقاري، ونص المحادثة.
- بيانات استخدام مجمّعة عبر أدوات التحليل، فقط بعد موافقتك على ملفات تعريف الارتباط التحليلية.

## كيف نستخدم بياناتك
- للتواصل معك بخصوص طلبك أو المشروع الذي استفسرت عنه.
- لدراسة طلب التمويل وتوجيهك للخيارات المتاحة؛ تقديم الطلب لا يعني موافقة تمويلية.
- لتحسين الموقع وخدماتنا.

## مشاركة البيانات
لا نبيع بياناتك. يطّلع عليها الموظفون المخوّلون فقط، وقد نشارك بيانات التمويل مع جهة تمويلية بعد موافقتك.

## الاحتفاظ بالبيانات
نحتفظ بالبيانات للمدة اللازمة لخدمتك ولمتطلبات الأنظمة، ونحذف محادثات المساعد العقاري تلقائياً بعد مدة محددة.

## حقوقك
يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها بالتواصل معنا عبر البريد الإلكتروني المنشور في صفحة تواصل معنا.`,
  en: `Masaken Aljafil Real Estate is committed to protecting your personal data. This policy explains what this website collects and how it is used.

## Data we collect
- Contact details you enter in inquiry and contact forms (name, mobile number, optional email and your message).
- Financing request details you choose to provide (operation type, salary, employer sector, salary bank, obligations, existing real estate loan, age).
- Search preferences you share with the property assistant and the conversation text.
- Aggregated usage data through analytics tools, only after you accept analytics cookies.

## How we use your data
- To contact you about your request or the project you asked about.
- To review your financing request and guide you to available options; submitting a request is not a financing approval.
- To improve the website and our services.

## Sharing
We do not sell your data. Only authorized staff can access it, and financing details may be shared with a financing provider with your consent.

## Retention
We keep data only as long as needed to serve you and to meet legal requirements. Property assistant conversations are deleted automatically after a set period.

## Your rights
You can request access to, correction of, or deletion of your data by contacting us at the email published on the Contact page.`,
};

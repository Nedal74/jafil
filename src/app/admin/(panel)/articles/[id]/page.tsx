import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm, ConfirmAction, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/forms";
import { MediaField } from "@/components/admin/MediaField";
import { PageHeader, Panel } from "@/components/admin/ui";
import { options, PUBLISH_LABELS } from "@/lib/admin/labels";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { deleteArticle, saveArticle } from "../actions";

export const metadata = { title: "مقال" };

function toLocalInput(d: Date | null | undefined) {
  if (!d) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default async function ArticleEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("articles.manage");
  const { id } = await params;
  const a = id === "new" ? null : await prisma.article.findUnique({ where: { id }, include: { coverImage: true } });
  if (id !== "new" && !a) notFound();
  return (
    <>
      <PageHeader
        title={a ? a.titleAr : "مقال جديد"}
        actions={a?.status === "PUBLISHED" && <Link href={`/ar/news/${encodeURIComponent(a.slugAr)}`} target="_blank" className="btn-outline px-3 py-1.5 text-xs">عرض ↗</Link>}
      />
      <ActionForm action={saveArticle} className="space-y-6">
        {a && <input type="hidden" name="id" value={a.id} />}
        <Panel title="المحتوى">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField name="titleAr" label="العنوان (عربي)" defaultValue={a?.titleAr} required />
            <TextField name="titleEn" label="العنوان (إنجليزي)" defaultValue={a?.titleEn} required dir="ltr" />
            <TextField name="slugAr" label="الرابط (عربي)" defaultValue={a?.slugAr} hint="يُولّد من العنوان إن تُرك فارغاً" />
            <TextField name="slugEn" label="الرابط (إنجليزي)" defaultValue={a?.slugEn} dir="ltr" />
            <TextArea name="excerptAr" label="المقتطف (عربي)" defaultValue={a?.excerptAr} rows={2} />
            <TextArea name="excerptEn" label="المقتطف (إنجليزي)" defaultValue={a?.excerptEn} rows={2} dir="ltr" />
            <TextArea name="bodyAr" label="النص (عربي)" defaultValue={a?.bodyAr} rows={14} hint='افصل الفقرات بسطر فارغ. "## " لعنوان فرعي و"- " لعناصر القائمة.' />
            <TextArea name="bodyEn" label="النص (إنجليزي)" defaultValue={a?.bodyEn} rows={14} dir="ltr" />
          </div>
        </Panel>
        <Panel title="النشر والوسائط وSEO">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField name="status" label="الحالة" defaultValue={a?.status ?? "DRAFT"} options={options(PUBLISH_LABELS)} />
            <TextField name="publishedAt" label="تاريخ النشر" type="datetime-local" defaultValue={toLocalInput(a?.publishedAt)} hint="تاريخ مستقبلي = نشر مجدول" />
            <MediaField name="coverImageId" label="صورة الغلاف" defaultValue={a?.coverImage} />
            <div />
            <TextField name="seoTitleAr" label="عنوان SEO (عربي)" defaultValue={a?.seoTitleAr} maxLength={70} />
            <TextField name="seoTitleEn" label="عنوان SEO (إنجليزي)" defaultValue={a?.seoTitleEn} maxLength={70} dir="ltr" />
            <TextArea name="seoDescriptionAr" label="الوصف (عربي)" defaultValue={a?.seoDescriptionAr} rows={2} maxLength={170} />
            <TextArea name="seoDescriptionEn" label="الوصف (إنجليزي)" defaultValue={a?.seoDescriptionEn} rows={2} maxLength={170} dir="ltr" />
          </div>
        </Panel>
        <div className="flex items-center justify-between">
          <SubmitButton>{a ? "حفظ" : "إنشاء"}</SubmitButton>
        </div>
      </ActionForm>
      {a && <div className="mt-6"><ConfirmAction action={deleteArticle} label="حذف المقال" fields={{ id: a.id }} confirm="حذف المقال نهائياً؟" /></div>}
    </>
  );
}

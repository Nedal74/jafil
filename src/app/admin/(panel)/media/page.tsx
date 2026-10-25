import { FileText } from "lucide-react";

import { ActionForm, ConfirmAction, SubmitButton } from "@/components/admin/forms";
import { AdminPagination, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { clampPage } from "@/lib/utils";
import { deleteMedia, updateMediaAlt } from "./actions";
import { Uploader } from "./Uploader";

export const metadata = { title: "مكتبة الوسائط" };
const SIZE = 24;

export default async function MediaLibrary({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser("media.manage");
  const page = clampPage((await searchParams).page);
  const [total, items] = await Promise.all([
    prisma.media.count(),
    prisma.media.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * SIZE, take: SIZE }),
  ]);
  return (
    <>
      <PageHeader title="مكتبة الوسائط" description="يُتحقق من نوع الملف من محتواه الفعلي وليس من امتداده. أضف نصاً بديلاً لكل صورة لتحسين الوصول وSEO." />
      <Uploader />
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((m) => (
          <li key={m.id} className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex aspect-[4/3] items-center justify-center bg-beige-50">
              {m.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={m.altAr ?? ""} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <a href={m.url} target="_blank" rel="noopener" className="flex flex-col items-center gap-1 text-xs text-muted"><FileText className="h-8 w-8" />PDF</a>
              )}
            </div>
            <div className="space-y-2 p-3">
              <p className="truncate text-xs text-muted" title={m.originalName}>{m.originalName} · {Math.round(m.size / 1024)}KB{m.width ? ` · ${m.width}×${m.height}` : ""}</p>
              <ActionForm action={updateMediaAlt} className="space-y-1.5">
                <input type="hidden" name="id" value={m.id} />
                <input name="altAr" defaultValue={m.altAr ?? ""} placeholder="النص البديل (عربي)" aria-label="النص البديل عربي" className="field px-2 py-1 text-xs" />
                <input name="altEn" defaultValue={m.altEn ?? ""} placeholder="Alt text (English)" aria-label="Alt text English" dir="ltr" className="field px-2 py-1 text-xs" />
                <SubmitButton variant="outline" className="w-full py-1 text-xs">حفظ</SubmitButton>
              </ActionForm>
              <ConfirmAction action={deleteMedia} label="حذف" variant="link" fields={{ id: m.id }} confirm="حذف الملف نهائياً؟ لن يُسمح بذلك إن كان مستخدماً." />
            </div>
          </li>
        ))}
      </ul>
      {!items.length && <p className="mt-6 text-center text-sm text-muted">لا توجد ملفات بعد.</p>}
      <AdminPagination page={page} pages={Math.ceil(total / SIZE)} total={total} hrefFor={(p) => `/admin/media?page=${p}`} />
    </>
  );
}

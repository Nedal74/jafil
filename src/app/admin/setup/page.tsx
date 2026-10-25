import Image from "next/image";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { setupKeyRequired } from "@/lib/auth/setup";
import { SetupForm } from "./SetupForm";

export const metadata = { title: "إعداد أول حساب" };

export default async function SetupPage() {
  if ((await prisma.user.count()) > 0) redirect("/admin/login");
  const needsKey = setupKeyRequired();
  const keyConfigured = Boolean(process.env.SETUP_KEY);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-navy p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/brand/logo-navy.png" alt="" width={64} height={64} priority />
          <h1 className="mt-3 text-xl font-bold text-navy">إعداد حساب مدير النظام</h1>
          <p className="mt-1 text-sm text-muted">هذه الصفحة تعمل مرة واحدة فقط، قبل إنشاء أي حساب.</p>
        </div>
        {needsKey && !keyConfigured ? (
          <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm leading-7 text-amber-900">
            أضف متغير البيئة <code dir="ltr">SETUP_KEY</code> (أي كلمة سرية تختارها) في إعدادات الاستضافة، ثم أعد النشر وارجع لهذه الصفحة.
          </p>
        ) : (
          <SetupForm needsKey={needsKey} />
        )}
      </div>
    </main>
  );
}

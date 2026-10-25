import Image from "next/image";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "تسجيل الدخول" };

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/admin");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-navy p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/brand/logo-navy.png" alt="" width={64} height={64} priority />
          <h1 className="mt-3 text-xl font-bold text-navy">لوحة تحكم مساكن الجافل</h1>
          <p className="mt-1 text-sm text-muted">سجّل الدخول للمتابعة</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}

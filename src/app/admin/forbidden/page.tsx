import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <p className="text-5xl font-bold text-sand">403</p>
      <h1 className="mt-3 text-xl font-bold text-navy">ليست لديك صلاحية للوصول لهذه الصفحة</h1>
      <Link href="/admin" className="btn-primary mt-6">العودة للوحة التحكم</Link>
    </main>
  );
}

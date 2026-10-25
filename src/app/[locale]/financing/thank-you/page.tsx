import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ThankYou({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const ref = firstParam((await searchParams).ref);
  const safeRef = ref && /^FIN-\d{8}-\d{6}$/.test(ref) ? ref : null;
  return (
    <section className="container-page flex min-h-[60vh] max-w-xl flex-col items-center justify-center py-20 text-center">
      <CheckCircle2 className="h-14 w-14 text-emerald-600" aria-hidden />
      <h1 className="mt-5 text-3xl font-bold text-navy">{t.financing.thanksTitle}</h1>
      <p className="mt-3 leading-8 text-muted">{t.financing.thanksText}</p>
      {safeRef && (
        <p className="mt-5 rounded-xl bg-beige px-6 py-3">
          <span className="block text-xs text-sand-700">{t.financing.reference}</span>
          <span className="text-xl font-bold tracking-wider text-navy" dir="ltr">{safeRef}</span>
        </p>
      )}
      <Link href={`/${locale}`} className="btn-primary mt-8">{t.financing.backHome}</Link>
    </section>
  );
}

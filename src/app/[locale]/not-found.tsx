import Link from "next/link";

import { getDictionary } from "@/lib/i18n/dictionaries";

// Rendered inside [locale]/layout; we can't read params here, so show bilingual copy.
export default function NotFound() {
  const ar = getDictionary("ar").notFound;
  const en = getDictionary("en").notFound;
  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-7xl font-bold text-sand">404</p>
      <h1 className="mt-4 text-2xl font-bold text-navy">{ar.title}</h1>
      <p className="mt-2 text-muted">{ar.text}</p>
      <p lang="en" dir="ltr" className="mt-4 text-sm text-muted">{en.title} — {en.text}</p>
      <div className="mt-8 flex gap-3">
        <Link href="/ar" className="btn-primary">{ar.back}</Link>
        <Link href="/en" className="btn-outline" lang="en">{en.back}</Link>
      </div>
    </section>
  );
}

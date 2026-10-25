import Link from "next/link";

import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-navy">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-line bg-white", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-semibold text-navy">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "green" | "amber" | "red" | "navy" | "sand" | "blue" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700",
    navy: "bg-navy text-white",
    sand: "bg-beige text-sand-700",
    blue: "bg-sky-50 text-sky-700",
  };
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: string | false }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-beige-50 text-start text-xs text-muted">
          <tr>{head.map((h, i) => <th key={i} scope="col" className="px-4 py-3 text-start font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <p className="px-4 py-10 text-center text-sm text-muted">{empty}</p>}
    </div>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

export function AdminPagination({ page, pages, hrefFor, total }: { page: number; pages: number; hrefFor: (p: number) => string; total: number }) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted">
      <span>الإجمالي: {total}</span>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 && <Link className="btn-outline px-3 py-1.5" href={hrefFor(page - 1)}>السابق</Link>}
          <span>صفحة {page} من {pages}</span>
          {page < pages && <Link className="btn-outline px-3 py-1.5" href={hrefFor(page + 1)}>التالي</Link>}
        </div>
      )}
    </div>
  );
}

export function StatCard({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-xl border border-line bg-white p-5 transition-colors hover:border-sand">{body}</Link>
  ) : (
    <div className="rounded-xl border border-line bg-white p-5">{body}</div>
  );
}

export function EmptyAdmin({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-sand/60 bg-beige-50 px-6 py-14 text-center">
      <p className="text-sm text-muted">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** GET search/filter bar; values persist via the URL so results are shareable and paginated server-side. */
export function FilterBar({ children }: { children: React.ReactNode }) {
  return <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-3">{children}<button className="btn-primary py-2">تطبيق</button></form>;
}

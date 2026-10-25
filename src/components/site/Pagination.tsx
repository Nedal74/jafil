import Link from "next/link";

export function Pagination({
  page,
  pages,
  hrefFor,
  labels,
}: {
  page: number;
  pages: number;
  hrefFor: (p: number) => string;
  labels: { previous: string; next: string; page: string; of: string };
}) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="pagination" className="mt-10 flex items-center justify-center gap-3 text-sm">
      {page > 1 ? <Link className="btn-outline" href={hrefFor(page - 1)} rel="prev">{labels.previous}</Link> : <span className="btn-outline pointer-events-none opacity-40">{labels.previous}</span>}
      <span className="text-muted">{labels.page} {page} {labels.of} {pages}</span>
      {page < pages ? <Link className="btn-outline" href={hrefFor(page + 1)} rel="next">{labels.next}</Link> : <span className="btn-outline pointer-events-none opacity-40">{labels.next}</span>}
    </nav>
  );
}

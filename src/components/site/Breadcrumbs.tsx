import Link from "next/link";

import { absoluteUrl, jsonLdScript } from "@/lib/seo";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items, light }: { items: Crumb[]; light?: boolean }) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: absoluteUrl(c.href) } : {}),
    })),
  };
  return (
    <nav aria-label="breadcrumb">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      <ol className={`flex flex-wrap items-center gap-2 text-sm ${light ? "text-beige/70" : "text-muted"}`}>
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="opacity-50">/</span>}
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className={light ? "hover:text-white" : "hover:text-navy"}>
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className={light ? "text-white" : "text-ink"}>{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

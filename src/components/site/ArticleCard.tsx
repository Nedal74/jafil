import Image from "next/image";
import Link from "next/link";

import { formatDate } from "@/lib/format";
import { pick, type Locale } from "@/lib/i18n/config";
import type { ArticleCardData } from "@/lib/public-data";

export function articleHref(locale: Locale, a: { slugAr: string; slugEn: string }) {
  return `/${locale}/news/${encodeURIComponent(locale === "ar" ? a.slugAr : a.slugEn)}`;
}

export function ArticleCard({ a, locale }: { a: ArticleCardData; locale: Locale }) {
  const title = pick(a, "title", locale);
  return (
    <article className="group card relative flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[16/10] bg-beige">
        {a.coverImage && (
          <Image src={a.coverImage.url} alt={pick(a.coverImage, "alt", locale) || ""} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {a.publishedAt && (
          <time dateTime={a.publishedAt.toISOString()} className="text-xs font-medium text-sand-600">
            {formatDate(a.publishedAt, locale)}
          </time>
        )}
        <h3 className="mt-2 text-lg font-semibold leading-snug text-navy">
          <Link href={articleHref(locale, a)} className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-sand group-hover:underline-offset-4">
            {title}
          </Link>
        </h3>
        {pick(a, "excerpt", locale) && <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted">{pick(a, "excerpt", locale)}</p>}
      </div>
    </article>
  );
}

import Image from "next/image";
import Link from "next/link";
import { BedDouble, MapPin, Maximize2 } from "lucide-react";

import { pick, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatArea, formatNumber, formatPrice, formatRange } from "@/lib/format";
import type { ProjectCardData } from "@/lib/public-data";
import { cn } from "@/lib/utils";

export function projectHref(locale: Locale, p: { slugAr: string; slugEn: string }) {
  return `/${locale}/projects/${encodeURIComponent(locale === "ar" ? p.slugAr : p.slugEn)}`;
}

export function StatusBadge({ label, tone }: { label: string; tone: "sand" | "navy" | "muted" | "green" }) {
  const tones = {
    sand: "bg-beige text-sand-700",
    navy: "bg-navy text-white",
    muted: "bg-gray-100 text-muted",
    green: "bg-emerald-50 text-emerald-700",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>{label}</span>;
}

export function ProjectCard({ p, locale, t, priority }: { p: ProjectCardData; locale: Locale; t: Dictionary; priority?: boolean }) {
  const name = pick(p, "name", locale);
  const place = [pick(p, "neighborhood", locale), pick(p, "city", locale)].filter(Boolean).join("، ");
  const price = p.priceMin != null ? formatPrice(p.priceMin, locale) : null;
  const area = formatRange(p.areaMin, p.areaMax, (n) => formatArea(n, locale));
  const beds = formatRange(p.bedroomsMin, p.bedroomsMax, (n) => formatNumber(n, locale));
  const salesTone = p.salesStatus === "AVAILABLE" ? "green" : p.salesStatus === "SOLD_OUT" ? "muted" : "sand";

  return (
    <article className="group card relative flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-[var(--shadow-soft)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-beige">
        {p.coverImage ? (
          <Image
            src={p.coverImage.url}
            alt={pick(p.coverImage, "alt", locale) || name}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sand-600">
            <span className="text-3xl font-bold opacity-40">{name.slice(0, 1)}</span>
          </div>
        )}
        <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
          <StatusBadge label={t.status.sales[p.salesStatus]} tone={salesTone} />
          {p.propertyType && <StatusBadge label={pick(p.propertyType, "name", locale)} tone="navy" />}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-navy">
          <Link href={projectHref(locale, p)} className="after:absolute after:inset-0">
            {name}
          </Link>
        </h3>
        {place && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
            <MapPin className="h-4 w-4 text-sand" aria-hidden />
            {place}
          </p>
        )}
        <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/80">
          {area && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">{t.common.area}</dt>
              <Maximize2 className="h-4 w-4 text-sand-600" aria-hidden />
              <dd>{area}</dd>
            </div>
          )}
          {beds && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">{t.common.bedrooms}</dt>
              <BedDouble className="h-4 w-4 text-sand-600" aria-hidden />
              <dd>{beds}</dd>
            </div>
          )}
        </dl>
        <div className="mt-auto flex items-end justify-between pt-5">
          {price ? (
            <p className="text-sm text-muted">
              {t.common.from} <span className="block text-lg font-bold text-navy">{price}</span>
            </p>
          ) : (
            <span />
          )}
          <span className="text-sm font-semibold text-sand-700 group-hover:text-navy">{t.common.viewProject} <span aria-hidden>{locale === "ar" ? "←" : "→"}</span></span>
        </div>
      </div>
    </article>
  );
}

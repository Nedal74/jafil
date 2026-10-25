import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/site/EmptyState";
import { PageHero } from "@/components/site/PageHero";
import { Pagination } from "@/components/site/Pagination";
import { ProjectCard } from "@/components/site/ProjectCard";
import { isLocale, pick } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { toLatinDigits } from "@/lib/phone";
import { getPropertyTypes, searchProjects, type ProjectFilters } from "@/lib/public-data";
import { buildMetadata } from "@/lib/seo";
import { clampPage, firstParam } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const sp = await searchParams;
  const filtered = Object.keys(sp).some((k) => k !== "page");
  return buildMetadata({
    locale,
    title: t.projects.title,
    description: t.projects.subtitle,
    paths: { ar: "/ar/projects", en: "/en/projects" },
    noindex: filtered, // filtered result pages are thin duplicates
  });
}

const STATUSES = ["UPCOMING", "UNDER_CONSTRUCTION", "COMPLETED"] as const;

export default async function ProjectsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const sp = await searchParams;
  const num = (v?: string) => {
    const n = Number(toLatinDigits(v ?? "").replace(/[^\d]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const statusParam = firstParam(sp.status);
  const filters: ProjectFilters = {
    type: firstParam(sp.type)?.slice(0, 60) || undefined,
    location: firstParam(sp.location)?.slice(0, 80) || undefined,
    maxPrice: num(firstParam(sp.maxPrice)),
    bedrooms: num(firstParam(sp.bedrooms)),
    status: STATUSES.find((s) => s === statusParam),
  };
  const page = clampPage(sp.page);
  const [types, result] = await Promise.all([getPropertyTypes(), searchProjects(filters, page)]);
  const hasFilters = Object.values(filters).some(Boolean);

  const qs = (p: number) => {
    const u = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && u.set(k, String(v)));
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/${locale}/projects${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHero title={t.projects.title} subtitle={t.projects.subtitle} crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.projects.title }]} />
      <section className="container-page py-12">
        <form method="get" className="card mb-10 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,1fr)_auto]" aria-label={t.projects.filters}>
          <label className="block">
            <span className="field-label">{t.common.type}</span>
            <select name="type" defaultValue={filters.type ?? ""} className="field">
              <option value="">{t.projects.allTypes}</option>
              {types.map((ty) => <option key={ty.id} value={ty.key}>{pick(ty, "name", locale)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="field-label">{t.common.location}</span>
            <input name="location" defaultValue={filters.location ?? ""} maxLength={80} className="field" />
          </label>
          <label className="block">
            <span className="field-label">{t.projects.maxBudget}</span>
            <input name="maxPrice" defaultValue={filters.maxPrice ?? ""} inputMode="numeric" dir="ltr" className="field" />
          </label>
          <label className="block">
            <span className="field-label">{t.projects.minBedrooms}</span>
            <select name="bedrooms" defaultValue={filters.bedrooms ?? ""} className="field">
              <option value="">{t.common.any}</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
            </select>
          </label>
          <label className="block">
            <span className="field-label">{t.common.status}</span>
            <select name="status" defaultValue={filters.status ?? ""} className="field">
              <option value="">{t.projects.allStatuses}</option>
              {STATUSES.map((s) => <option key={s} value={s}>{t.status.construction[s]}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="btn-primary flex-1">{t.projects.apply}</button>
            {hasFilters && <Link href={`/${locale}/projects`} className="btn-outline">{t.projects.reset}</Link>}
          </div>
        </form>

        {result.items.length ? (
          <>
            <p className="mb-5 text-sm text-muted" aria-live="polite">{result.total} {t.projects.results}</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((p, i) => <ProjectCard key={p.id} p={p} locale={locale} t={t} priority={i < 3} />)}
            </div>
            <Pagination page={page} pages={result.pages} hrefFor={qs} labels={t.common} />
          </>
        ) : (
          <EmptyState text={hasFilters ? t.projects.empty : t.projects.emptyAll}>
            <Link href={`/${locale}/contact`} className="btn-primary">{t.nav.contactCta}</Link>
          </EmptyState>
        )}
      </section>
    </>
  );
}

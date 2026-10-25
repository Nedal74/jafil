import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleCard } from "@/components/site/ArticleCard";
import { EmptyState } from "@/components/site/EmptyState";
import { PageHero } from "@/components/site/PageHero";
import { Pagination } from "@/components/site/Pagination";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { listArticles } from "@/lib/public-data";
import { buildMetadata } from "@/lib/seo";
import { clampPage } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return buildMetadata({ locale, title: t.news.title, description: t.news.subtitle, paths: { ar: "/ar/news", en: "/en/news" } });
}

export default async function NewsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const page = clampPage((await searchParams).page);
  const { items, pages } = await listArticles(page);
  return (
    <>
      <PageHero title={t.news.title} subtitle={t.news.subtitle} crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.news.title }]} />
      <section className="container-page py-14">
        {items.length ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => <ArticleCard key={a.id} a={a} locale={locale} />)}
            </div>
            <Pagination page={page} pages={pages} hrefFor={(p) => `/${locale}/news${p > 1 ? `?page=${p}` : ""}`} labels={t.common} />
          </>
        ) : (
          <EmptyState text={t.news.empty} />
        )}
      </section>
    </>
  );
}

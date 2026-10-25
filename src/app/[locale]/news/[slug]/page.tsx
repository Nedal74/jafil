import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RichText } from "@/components/site/RichText";
import { formatDate } from "@/lib/format";
import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { findRedirect, getArticleBySlug } from "@/lib/public-data";
import { absoluteUrl, buildMetadata, jsonLdScript } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

async function load(locale: Locale, raw: string) {
  const slug = decodeURIComponent(raw);
  const a = await getArticleBySlug(locale, slug);
  if (a) return a;
  const r = await findRedirect(`/${locale}/news/${slug}`);
  if (r) permanentRedirect(r.toPath);
  notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const a = await load(locale, slug);
  return buildMetadata({
    locale,
    type: "article",
    title: pick(a, "seoTitle", locale) || pick(a, "title", locale),
    description: pick(a, "seoDescription", locale) || pick(a, "excerpt", locale),
    paths: { ar: `/ar/news/${encodeURIComponent(a.slugAr)}`, en: `/en/news/${encodeURIComponent(a.slugEn)}` },
    image: a.coverImage?.url,
  });
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const a = await load(locale, slug);
  const title = pick(a, "title", locale);
  const body = pick(a, "body", locale);
  const ld = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    datePublished: a.publishedAt?.toISOString(),
    dateModified: a.updatedAt.toISOString(),
    image: a.coverImage ? [absoluteUrl(a.coverImage.url)] : undefined,
    publisher: { "@type": "Organization", name: t.brand.name, logo: { "@type": "ImageObject", url: absoluteUrl("/brand/logo-navy.png") } },
    mainEntityOfPage: absoluteUrl(`/${locale}/news/${encodeURIComponent(locale === "ar" ? a.slugAr : a.slugEn)}`),
  };
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      <header className="bg-beige-50">
        <div className="container-page max-w-3xl py-12">
          <Breadcrumbs items={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.news.title, href: `/${locale}/news` }, { label: title }]} />
          <h1 className="mt-6 text-3xl font-bold leading-tight text-navy sm:text-4xl">{title}</h1>
          {a.publishedAt && <p className="mt-4 text-sm text-muted">{t.news.published} <time dateTime={a.publishedAt.toISOString()}>{formatDate(a.publishedAt, locale)}</time></p>}
        </div>
      </header>
      {a.coverImage && (
        <div className="container-page max-w-4xl">
          <div className="relative -mt-2 aspect-[16/9] overflow-hidden rounded-2xl bg-beige">
            <Image src={a.coverImage.url} alt={pick(a.coverImage, "alt", locale) || title} fill priority sizes="(min-width: 1024px) 896px, 100vw" className="object-cover" />
          </div>
        </div>
      )}
      <div className="container-page max-w-3xl py-12 text-lg text-ink">
        {pick(a, "excerpt", locale) && <p className="mb-8 text-xl leading-9 text-muted">{pick(a, "excerpt", locale)}</p>}
        {body && <RichText text={body} />}
        <Link href={`/${locale}/news`} className="btn-outline mt-10">{t.news.back}</Link>
      </div>
    </article>
  );
}

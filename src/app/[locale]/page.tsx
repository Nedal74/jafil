import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Award, Building2, CheckCircle2, Clock3, Gem, Handshake, Home, KeyRound, Search, ShieldCheck, Sparkles } from "lucide-react";

import { ArticleCard } from "@/components/site/ArticleCard";
import { Carousel } from "@/components/site/Carousel";
import { EmptyState } from "@/components/site/EmptyState";
import { HeroCarousel } from "@/components/site/HeroCarousel";
import { ProjectCard, projectHref } from "@/components/site/ProjectCard";
import { SectionHeading } from "@/components/site/SectionHeading";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { formatNumber } from "@/lib/format";
import { getHomeSections, type HomeSectionConfig } from "@/lib/home-sections";
import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { whatsappLink } from "@/lib/phone";
import { getAdvantages, getHomeProjects, getPropertyTypes, getStats, listArticles } from "@/lib/public-data";
import { buildMetadata } from "@/lib/seo";
import { readSetting } from "@/lib/settings";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const seo = await readSetting("seo");
  return {
    ...buildMetadata({
      locale,
      title: pick(seo, "title", locale),
      description: pick(seo, "description", locale),
      paths: { ar: "/ar", en: "/en" },
      image: seo.ogImageUrl || null,
    }),
    title: { absolute: pick(seo, "title", locale) },
  };
}

const ICONS = { check: CheckCircle2, shield: ShieldCheck, award: Award, gem: Gem, key: KeyRound, home: Home, clock: Clock3, handshake: Handshake, sparkles: Sparkles, building: Building2 };

function heading(s: HomeSectionConfig, locale: Locale, fallback: string) {
  return { title: pick(s, "title", locale) || fallback, subtitle: pick(s, "subtitle", locale) || null };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const rtl = locale === "ar";

  const [sections, projects, types, stats, advantages, articles, company, chairman, contact] = await Promise.all([
    getHomeSections(),
    getHomeProjects(),
    getPropertyTypes(),
    getStats(),
    getAdvantages(),
    listArticles(1, 3),
    readSetting("company"),
    readSetting("chairman"),
    readSetting("contact"),
  ]);

  const wa = contact.whatsapp ? whatsappLink(contact.whatsapp) : null;
  const projectsHref = `/${locale}/projects`;

  const render = (s: HomeSectionConfig) => {
    switch (s.key) {
      case "hero": {
        const h = heading(s, locale, t.home.heroFallbackTitle);
        return (
          <HeroCarousel
            key={s.key}
            rtl={rtl}
            fallbackTitle={h.title}
            fallbackSubtitle={h.subtitle ?? t.home.heroFallbackSubtitle}
            ctaLabel={t.common.viewProject}
            primaryHref={projectsHref}
            primaryLabel={t.nav.projects}
            slides={projects.hero.map((p) => ({
              id: p.id,
              title: pick(p, "name", locale),
              place: [pick(p, "neighborhood", locale), pick(p, "city", locale)].filter(Boolean).join("، "),
              status: t.status.sales[p.salesStatus],
              href: projectHref(locale, p),
              image: p.coverImage?.url ?? null,
              alt: (p.coverImage && pick(p.coverImage, "alt", locale)) || pick(p, "name", locale),
            }))}
          />
        );
      }
      case "search":
        return (
          <section key={s.key} aria-labelledby="search-h" className="relative z-10 -mt-10">
            <div className="container-page">
              <form action={projectsHref} method="get" className="card grid gap-3 p-4 shadow-[var(--shadow-soft)] sm:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_1fr_1fr_auto]">
                <h2 id="search-h" className="sr-only">{heading(s, locale, t.home.searchTitle).title}</h2>
                <label className="block">
                  <span className="field-label">{t.home.searchType}</span>
                  <select name="type" className="field" defaultValue="">
                    <option value="">{t.projects.allTypes}</option>
                    {types.map((ty) => <option key={ty.id} value={ty.key}>{pick(ty, "name", locale)}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">{t.home.searchLocation}</span>
                  <input name="location" maxLength={80} className="field" />
                </label>
                <label className="block">
                  <span className="field-label">{t.home.searchBudget}</span>
                  <input name="maxPrice" inputMode="numeric" pattern="[0-9]*" className="field" dir="ltr" />
                </label>
                <button type="submit" className="btn-primary self-end py-3 sm:col-span-2 lg:col-span-1">
                  <Search className="h-4 w-4" aria-hidden /> {t.home.searchSubmit}
                </button>
              </form>
            </div>
          </section>
        );
      case "intro": {
        const intro = pick(company, "intro", locale);
        if (!intro) return null;
        const h = heading(s, locale, t.home.introTitle);
        return (
          <section key={s.key} className="py-20">
            <div className="container-page grid items-center gap-10 lg:grid-cols-2">
              <div>
                <p className="eyebrow">{t.brand.name}</p>
                <h2 className="mt-3 text-3xl font-bold text-navy">{h.title}</h2>
                {h.subtitle && <p className="mt-3 text-lg text-sand-700">{h.subtitle}</p>}
                <p className="mt-5 whitespace-pre-line leading-8 text-muted">{intro}</p>
                <Link href={`/${locale}/about`} className="btn-outline mt-7">{t.common.readMore}</Link>
              </div>
              <div aria-hidden className="relative hidden aspect-[5/4] overflow-hidden rounded-2xl bg-beige lg:block">
                <Image src="/brand/logo-navy.png" alt="" fill sizes="40vw" className="object-contain p-24 opacity-90" />
              </div>
            </div>
          </section>
        );
      }
      case "chairman": {
        const message = pick(chairman, "message", locale);
        if (!message) return null;
        const h = heading(s, locale, t.home.chairmanTitle);
        return (
          <section key={s.key} className="bg-beige py-20">
            <div className="container-page grid gap-10 lg:grid-cols-[280px_1fr] lg:items-center">
              {chairman.photoUrl ? (
                <div className="relative mx-auto aspect-[4/5] w-56 overflow-hidden rounded-2xl bg-white lg:w-full">
                  <Image src={chairman.photoUrl} alt={pick(chairman, "name", locale)} fill sizes="280px" className="object-cover" />
                </div>
              ) : <div className="hidden lg:block" />}
              <figure>
                <p className="eyebrow">{h.title}</p>
                <blockquote className="mt-4 whitespace-pre-line text-lg leading-9 text-ink">{message}</blockquote>
                <figcaption className="mt-6 flex items-center gap-4">
                  {chairman.signatureUrl && <Image src={chairman.signatureUrl} alt="" width={120} height={48} className="h-12 w-auto object-contain" />}
                  <span>
                    <span className="block font-semibold text-navy">{pick(chairman, "name", locale)}</span>
                    <span className="text-sm text-muted">{pick(chairman, "title", locale)}</span>
                  </span>
                </figcaption>
              </figure>
            </div>
          </section>
        );
      }
      case "featured":
      case "completed": {
        const list = s.key === "featured" ? projects.featured : projects.completed;
        const h = heading(s, locale, s.key === "featured" ? t.home.featuredTitle : t.home.completedTitle);
        if (!list.length && s.key === "completed") return null;
        return (
          <section key={s.key} className="py-20">
            <div className="container-page">
              <SectionHeading eyebrow={t.nav.projects} title={h.title} subtitle={h.subtitle} action={list.length ? { href: projectsHref, label: t.common.viewAll } : undefined} />
              {list.length ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((p) => <ProjectCard key={p.id} p={p} locale={locale} t={t} />)}
                </div>
              ) : (
                <EmptyState text={t.home.noProjects}>
                  <Link href={`/${locale}/contact`} className="btn-primary">{t.nav.contactCta}</Link>
                </EmptyState>
              )}
            </div>
          </section>
        );
      }
      case "current": {
        if (!projects.current.length) return null;
        const h = heading(s, locale, t.home.currentTitle);
        return (
          <section key={s.key} className="bg-beige-50 py-20">
            <div className="container-page">
              <SectionHeading eyebrow={t.nav.projects} title={h.title} subtitle={h.subtitle} />
              <Carousel label={h.title} rtl={rtl}>
                {projects.current.map((p) => (
                  <div key={p.id} className="w-[85%] shrink-0 snap-start sm:w-[46%] lg:w-[31.5%]">
                    <ProjectCard p={p} locale={locale} t={t} />
                  </div>
                ))}
              </Carousel>
            </div>
          </section>
        );
      }
      case "stats": {
        if (!stats.length) return null;
        const h = heading(s, locale, t.home.statsTitle);
        return (
          <section key={s.key} aria-label={h.title} className="bg-navy py-16 text-white">
            <div className="container-page">
              <h2 className="sr-only">{h.title}</h2>
              <dl className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
                {stats.map((st) => (
                  <div key={st.id}>
                    <dd className="text-4xl font-bold text-sand">{st.prefix}{formatNumber(st.value, locale)}{st.suffix}</dd>
                    <dt className="mt-2 text-sm text-beige/80">{pick(st, "label", locale)}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        );
      }
      case "advantages": {
        if (!advantages.length) return null;
        const h = heading(s, locale, t.home.advantagesTitle);
        return (
          <section key={s.key} className="py-20">
            <div className="container-page">
              <SectionHeading title={h.title} subtitle={h.subtitle} />
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {advantages.map((a) => {
                  const Icon = ICONS[a.icon as keyof typeof ICONS] ?? CheckCircle2;
                  return (
                    <li key={a.id} className="card p-6 transition-colors hover:border-sand">
                      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-beige text-sand-700"><Icon className="h-5 w-5" aria-hidden /></span>
                      <h3 className="mt-4 font-semibold text-navy">{pick(a, "title", locale)}</h3>
                      {pick(a, "description", locale) && <p className="mt-2 text-sm leading-7 text-muted">{pick(a, "description", locale)}</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        );
      }
      case "news": {
        const h = heading(s, locale, t.home.newsTitle);
        if (!articles.items.length) return null;
        return (
          <section key={s.key} className="bg-beige-50 py-20">
            <div className="container-page">
              <SectionHeading title={h.title} subtitle={h.subtitle} action={{ href: `/${locale}/news`, label: t.common.viewAll }} />
              <div className="grid gap-6 md:grid-cols-3">
                {articles.items.map((a) => <ArticleCard key={a.id} a={a} locale={locale} />)}
              </div>
            </div>
          </section>
        );
      }
      case "cta": {
        const h = heading(s, locale, t.home.ctaTitle);
        return (
          <section key={s.key} className="py-20">
            <div className="container-page">
              <div className="relative overflow-hidden rounded-2xl bg-navy px-6 py-12 text-white sm:px-12">
                <div aria-hidden className="absolute inset-y-0 end-0 w-1/3 opacity-10 [background:repeating-linear-gradient(135deg,#b5a184_0_2px,transparent_2px_18px)]" />
                <div className="relative max-w-2xl">
                  <h2 className="text-2xl font-bold sm:text-3xl">{h.title}</h2>
                  <p className="mt-3 leading-8 text-beige/80">{h.subtitle ?? t.home.ctaText}</p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link href={`/${locale}/contact`} className="btn-sand px-6 py-3">{t.nav.contactCta}</Link>
                    {wa && <WhatsAppButton href={wa} label={t.common.whatsapp} className="px-6 py-3" />}
                    {contact.phones[0] && <a href={`tel:${contact.phones[0]}`} className="btn-ghost-light px-6 py-3" dir="ltr">{contact.phones[0]}</a>}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      }
    }
  };

  return <>{sections.filter((s) => s.enabled).map((s) => render(s))}</>;
}


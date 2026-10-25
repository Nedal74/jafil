import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/site/PageHero";
import { formatNumber } from "@/lib/format";
import { isLocale, pick } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getStats } from "@/lib/public-data";
import { buildMetadata } from "@/lib/seo";
import { readSetting } from "@/lib/settings";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const company = await readSetting("company");
  return buildMetadata({
    locale,
    title: getDictionary(locale).about.title,
    description: pick(company, "intro", locale).slice(0, 200) || null,
    paths: { ar: "/ar/about", en: "/en/about" },
  });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const [company, chairman, stats] = await Promise.all([readSetting("company"), readSetting("chairman"), getStats()]);
  const about = pick(company, "about", locale) || pick(company, "intro", locale);
  const vision = pick(company, "vision", locale);
  const mission = pick(company, "mission", locale);
  const values = pick(company, "values", locale);
  const chairmanMsg = pick(chairman, "message", locale);

  return (
    <>
      <PageHero title={t.about.title} crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.about.title }]} />
      <section className="container-page grid gap-12 py-16 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="eyebrow">{pick(company, "name", locale)}</p>
          {about ? (
            <div className="mt-4 whitespace-pre-line text-lg leading-9 text-ink">{about}</div>
          ) : (
            <p className="mt-4 text-muted">{t.footer.about}</p>
          )}
        </div>
        <div aria-hidden className="relative hidden aspect-square rounded-2xl bg-beige lg:block">
          <Image src="/brand/logo-navy.png" alt="" fill sizes="320px" className="object-contain p-16" />
        </div>
      </section>

      {(vision || mission) && (
        <section className="relative overflow-hidden bg-navy text-white">
          <div aria-hidden className="absolute inset-y-0 start-1/2 hidden w-40 -translate-x-1/2 opacity-10 [background:repeating-linear-gradient(90deg,#f0e7d6_0_14px,transparent_14px_34px)] lg:block" />
          <div className="container-page relative grid gap-12 py-16 lg:grid-cols-2 lg:gap-56">
            {mission && (
              <div>
                <h2 className="text-3xl font-bold">{t.about.mission}</h2>
                <p className="mt-1 font-serif text-xl italic text-sand" lang="en">Our Mission</p>
                <p className="mt-6 whitespace-pre-line leading-8 text-beige/85">{mission}</p>
              </div>
            )}
            {vision && (
              <div>
                <h2 className="text-3xl font-bold">{t.about.vision}</h2>
                <p className="mt-1 font-serif text-xl italic text-sand" lang="en">Our Vision</p>
                <p className="mt-6 whitespace-pre-line leading-8 text-beige/85">{vision}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {values && (
        <section className="container-page py-16">
          <h2 className="text-2xl font-bold text-navy">{t.about.values}</h2>
          <p className="mt-4 max-w-3xl whitespace-pre-line leading-8 text-muted">{values}</p>
        </section>
      )}

      {chairmanMsg && (
        <section className="bg-beige py-16">
          <div className="container-page max-w-4xl">
            <p className="eyebrow">{t.home.chairmanTitle}</p>
            <blockquote className="mt-4 whitespace-pre-line text-lg leading-9">{chairmanMsg}</blockquote>
            <p className="mt-5 font-semibold text-navy">{pick(chairman, "name", locale)}</p>
            <p className="text-sm text-muted">{pick(chairman, "title", locale)}</p>
          </div>
        </section>
      )}

      {stats.length > 0 && (
        <section className="container-page py-16">
          <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.id} className="card p-6 text-center">
                <dd className="text-3xl font-bold text-navy">{s.prefix}{formatNumber(s.value, locale)}{s.suffix}</dd>
                <dt className="mt-1 text-sm text-muted">{pick(s, "label", locale)}</dt>
              </div>
            ))}
          </dl>
        </section>
      )}
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock3, Headphones, ShieldCheck, FileCheck2 } from "lucide-react";

import { FinancingForm } from "@/components/site/FinancingForm";
import { PageHero } from "@/components/site/PageHero";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildMetadata } from "@/lib/seo";
import { readSetting } from "@/lib/settings";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return buildMetadata({ locale, title: t.financing.title, description: t.financing.subtitle, paths: { ar: "/ar/financing", en: "/en/financing" } });
}

const PERK_ICONS = [Headphones, ShieldCheck, FileCheck2, Clock3];

export default async function FinancingPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { banks } = await readSetting("financing");
  return (
    <>
      <PageHero title={t.financing.title} subtitle={t.financing.subtitle} crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.nav.financing }]} />
      <section className="bg-beige-50 pb-16">
        <div className="container-page max-w-5xl">
          <div className="card relative -mt-8 p-6 shadow-[var(--shadow-soft)] sm:p-10">
            <FinancingForm
              locale={locale}
              t={t.financing}
              forms={t.forms}
              sar={t.common.sar}
              sendingLabel={t.common.sending}
              privacyHref={`/${locale}/privacy`}
              banks={banks.map((b) => ({ value: b.ar, label: locale === "ar" ? b.ar : b.en }))}
            />
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.financing.perks.map((p, i) => {
              const Icon = PERK_ICONS[i] ?? ShieldCheck;
              return (
                <li key={p.title} className="card p-6 text-center">
                  <Icon className="mx-auto h-9 w-9 text-sand-600" strokeWidth={1.5} aria-hidden />
                  <h2 className="mt-4 font-semibold text-navy">{p.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{p.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}

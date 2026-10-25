import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/site/PageHero";
import { RichText } from "@/components/site/RichText";
import { isLocale, pick } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_PRIVACY } from "@/lib/privacy-default";
import { buildMetadata } from "@/lib/seo";
import { readSetting } from "@/lib/settings";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return buildMetadata({ locale, title: getDictionary(locale).privacy.title, paths: { ar: "/ar/privacy", en: "/en/privacy" } });
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const privacy = await readSetting("privacy");
  const content = pick(privacy, "content", locale) || DEFAULT_PRIVACY[locale];
  return (
    <>
      <PageHero title={t.privacy.title} crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.privacy.title }]} />
      <article className="container-page max-w-3xl py-14 text-ink"><RichText text={content} /></article>
    </>
  );
}


import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock3, Mail, MapPin, Phone } from "lucide-react";

import { LeadForm } from "@/components/site/LeadForm";
import { PageHero } from "@/components/site/PageHero";
import { SocialLinks } from "@/components/site/SocialLinks";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { isLocale, pick } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { whatsappLink } from "@/lib/phone";
import { buildMetadata, jsonLdScript, absoluteUrl } from "@/lib/seo";
import { readSetting } from "@/lib/settings";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return buildMetadata({ locale, title: t.contact.title, description: t.contact.subtitle, paths: { ar: "/ar/contact", en: "/en/contact" } });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const [contact, company] = await Promise.all([readSetting("contact"), readSetting("company")]);
  const address = pick(contact, "address", locale);
  const hours = pick(contact, "workingHours", locale);
  const wa = contact.whatsapp ? whatsappLink(contact.whatsapp) : null;

  const ld = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: pick(company, "name", locale),
    url: absoluteUrl(`/${locale}`),
    email: contact.email || undefined,
    telephone: contact.phones[0] || undefined,
    address: address ? { "@type": "PostalAddress", streetAddress: address, addressLocality: locale === "ar" ? "الرياض" : "Riyadh", addressCountry: "SA" } : undefined,
    sameAs: Object.values(contact.socials).filter(Boolean),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      <PageHero title={t.contact.title} subtitle={t.contact.subtitle} crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.contact.title }]} />
      <section className="container-page grid gap-10 py-14 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-xl font-bold text-navy">{t.contact.info}</h2>
          <ul className="mt-6 space-y-5">
            {address && (
              <li className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-beige text-sand-700"><MapPin className="h-5 w-5" aria-hidden /></span>
                <div><p className="text-sm font-medium text-muted">{t.contact.address}</p><p className="mt-0.5 text-ink">{address}</p>
                  {contact.mapUrl && <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-navy underline">{t.project.openMap}</a>}
                </div>
              </li>
            )}
            {contact.phones.length > 0 && (
              <li className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-beige text-sand-700"><Phone className="h-5 w-5" aria-hidden /></span>
                <div><p className="text-sm font-medium text-muted">{t.contact.phones}</p>
                  {contact.phones.map((p) => <a key={p} href={`tel:${p}`} dir="ltr" className="block text-ink hover:text-navy">{p}</a>)}
                </div>
              </li>
            )}
            {contact.email && (
              <li className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-beige text-sand-700"><Mail className="h-5 w-5" aria-hidden /></span>
                <div><p className="text-sm font-medium text-muted">{t.contact.email}</p><a href={`mailto:${contact.email}`} className="text-ink hover:text-navy">{contact.email}</a></div>
              </li>
            )}
            {hours && (
              <li className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-beige text-sand-700"><Clock3 className="h-5 w-5" aria-hidden /></span>
                <p className="self-center text-ink">{hours}</p>
              </li>
            )}
          </ul>
          {wa && <WhatsAppButton href={wa} label={t.common.whatsapp} className="mt-8" />}
          <div className="mt-8 rounded-xl bg-navy p-5"><SocialLinks socials={contact.socials} /></div>
        </div>
        <div className="card p-6 sm:p-8">
          <h2 className="mb-6 text-xl font-bold text-navy">{t.contact.formTitle}</h2>
          <LeadForm locale={locale} t={t.forms} sendLabel={t.common.send} sendingLabel={t.common.sending} source="CONTACT_FORM" showEmail showMessage privacyHref={`/${locale}/privacy`} />
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { SettingValue } from "@/lib/settings";
import { Logo } from "./Logo";
import { SocialLinks } from "./SocialLinks";

export function Footer({ locale, t, contact }: { locale: Locale; t: Dictionary; contact: SettingValue<"contact"> }) {
  const year = new Date().getFullYear();
  const address = locale === "ar" ? contact.addressAr : contact.addressEn || contact.addressAr;
  return (
    <footer className="bg-navy text-beige/90">
      <div className="container-page grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo locale={locale} variant="light" />
          <p className="mt-5 max-w-sm text-sm leading-7 text-beige/70">{t.footer.about}</p>
          <SocialLinks socials={contact.socials} className="mt-6" />
        </div>
        <div className="md:col-span-3">
          <h2 className="text-sm font-semibold text-white">{t.footer.links}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              [`/${locale}/projects`, t.nav.projects],
              [`/${locale}/about`, t.nav.about],
              [`/${locale}/financing`, t.nav.financing],
              [`/${locale}/news`, t.nav.news],
              [`/${locale}/contact`, t.nav.contact],
              [`/${locale}/privacy`, t.footer.privacy],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-beige/70 transition-colors hover:text-white">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-4">
          <h2 className="text-sm font-semibold text-white">{t.footer.contact}</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {address && (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sand" aria-hidden />
                <span>{address}</span>
              </li>
            )}
            {contact.phones.map((p) => (
              <li key={p} className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-sand" aria-hidden />
                <a href={`tel:${p}`} dir="ltr" className="hover:text-white">{p}</a>
              </li>
            ))}
            {contact.email && (
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-sand" aria-hidden />
                <a href={`mailto:${contact.email}`} className="hover:text-white">{contact.email}</a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-beige/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {t.brand.name}. {t.footer.rights}.</p>
          <Link href={`/${locale}/privacy`} className="hover:text-white">{t.footer.privacy}</Link>
        </div>
      </div>
    </footer>
  );
}

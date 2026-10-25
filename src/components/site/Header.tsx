"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";

import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header({ locale, t, phone }: { locale: Locale; t: Dictionary; phone: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: `/${locale}`, label: t.nav.home, exact: true },
    { href: `/${locale}/projects`, label: t.nav.projects },
    { href: `/${locale}/about`, label: t.nav.about },
    { href: `/${locale}/financing`, label: t.nav.financing },
    { href: `/${locale}/news`, label: t.nav.news },
    { href: `/${locale}/contact`, label: t.nav.contact },
  ];
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname?.startsWith(href));

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-white/95 backdrop-blur transition-shadow",
        scrolled ? "border-line shadow-[0_4px_20px_-12px_rgb(25_47_73/0.25)]" : "border-transparent",
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-2 focus:z-50 focus:rounded focus:bg-navy focus:px-3 focus:py-2 focus:text-white">
        {t.nav.skip}
      </a>
      <div className="container-page flex h-[72px] items-center justify-between gap-6">
        <Logo locale={locale} />
        <nav aria-label={t.nav.menu} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={isActive(l.href, l.exact) ? "page" : undefined}
                  className={cn(
                    "relative rounded-md px-3 py-2 text-[15px] font-medium text-ink/80 transition-colors hover:text-navy",
                    isActive(l.href, l.exact) && "text-navy after:absolute after:inset-x-3 after:-bottom-[17px] after:h-0.5 after:bg-sand",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher
            locale={locale}
            label={t.nav.switchLang}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-muted hover:text-navy"
          />
          <Link href={`/${locale}/contact`} className="btn-primary">
            <Phone className="h-4 w-4" aria-hidden />
            {t.nav.contactCta}
          </Link>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-navy lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? t.nav.close : t.nav.menu}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      <div id="mobile-nav" hidden={!open} className="border-t border-line bg-white lg:hidden">
        <nav className="container-page flex flex-col py-3" aria-label={t.nav.menu}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href, l.exact) ? "page" : undefined}
              className="rounded-md px-2 py-3 text-base font-medium text-ink aria-[current=page]:text-navy aria-[current=page]:font-semibold"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-4">
            <LanguageSwitcher locale={locale} label={t.nav.switchLang} className="inline-flex items-center gap-2 text-sm font-medium text-muted" />
            {phone && (
              <a href={`tel:${phone}`} className="btn-primary" dir="ltr">
                <Phone className="h-4 w-4" aria-hidden /> {phone}
              </a>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

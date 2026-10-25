import "../globals.css";

import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import { AssistantWidget } from "@/components/site/AssistantWidget";
import { Analytics } from "@/components/site/Analytics";
import { ConsentBanner } from "@/components/site/ConsentBanner";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { siteUrl } from "@/lib/env";
import { dir, isLocale, pick } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPropertyTypes } from "@/lib/public-data";
import { readSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#192F49", width: "device-width", initialScale: 1 };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const seo = await readSetting("seo");
  const title = pick(seo, "title", locale);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s | ${title}` },
    description: pick(seo, "description", locale),
    applicationName: title,
    icons: { icon: "/brand/logo-navy.png", apple: "/brand/logo-navy.png" },
    verification: seo.searchConsoleVerification ? { google: seo.searchConsoleVerification } : undefined,
    robots: seo.indexingEnabled ? undefined : { index: false, follow: false },
    openGraph: { siteName: title, images: seo.ogImageUrl ? [{ url: seo.ogImageUrl }] : undefined },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const [contact, google, assistant, types] = await Promise.all([
    readSetting("contact"),
    readSetting("google"),
    readSetting("assistant"),
    getPropertyTypes(),
  ]);

  return (
    <html lang={locale} dir={dir(locale)}>
      <head>
        <Analytics ga4={google.ga4MeasurementId} gtm={google.gtmContainerId} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <Header locale={locale} t={t} phone={contact.phones[0] ?? null} />
        <main id="main" className="flex-1">{children}</main>
        <Footer locale={locale} t={t} contact={contact} />
        {assistant.enabled && (
          <AssistantWidget
            locale={locale}
            t={t.assistant}
            forms={t.forms}
            welcome={pick(assistant, "welcome", locale)}
            types={types.map((ty) => ({ key: ty.key, label: pick(ty, "name", locale) }))}
            privacyHref={`/${locale}/privacy`}
          />
        )}
        {(google.ga4MeasurementId || google.gtmContainerId) && (
          <ConsentBanner text={t.consent.text} accept={t.consent.accept} reject={t.consent.reject} />
        )}
      </body>
    </html>
  );
}

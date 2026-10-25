import Image from "next/image";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { CheckCircle2, Clock3, MapPin, Phone, ShieldCheck } from "lucide-react";

import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Gallery } from "@/components/site/Gallery";
import { LeadForm } from "@/components/site/LeadForm";
import { ProjectCard } from "@/components/site/ProjectCard";
import { SectionHeading } from "@/components/site/SectionHeading";
import { TrackView } from "@/components/site/TrackView";
import { UnitsTable, type PublicUnit } from "@/components/site/UnitsTable";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { formatArea, formatNumber, formatPrice, formatRange } from "@/lib/format";
import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { whatsappLink } from "@/lib/phone";
import { findRedirect, getProjectBySlug, getRelatedProjects } from "@/lib/public-data";
import { absoluteUrl, buildMetadata, jsonLdScript } from "@/lib/seo";
import { readSetting } from "@/lib/settings";
import { firstParam } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function load(locale: Locale, rawSlug: string) {
  const slug = decodeURIComponent(rawSlug);
  const project = await getProjectBySlug(locale, slug);
  if (project) return project;
  const r = await findRedirect(`/${locale}/projects/${slug}`);
  if (r) permanentRedirect(r.toPath);
  notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const p = await load(locale, slug);
  return buildMetadata({
    locale,
    title: pick(p, "seoTitle", locale) || pick(p, "name", locale),
    description: pick(p, "seoDescription", locale) || pick(p, "summary", locale),
    paths: { ar: `/ar/projects/${encodeURIComponent(p.slugAr)}`, en: `/en/projects/${encodeURIComponent(p.slugEn)}` },
    image: p.ogImage?.url ?? p.coverImage?.url ?? null,
    canonical: p.canonicalUrl,
  });
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const p = await load(locale, slug);
  const [related, contact] = await Promise.all([getRelatedProjects(p.id, p.propertyTypeId), readSetting("contact")]);
  const selectedUnitId = firstParam((await searchParams).unit);
  const selectedUnit = p.units.find((u) => u.id === selectedUnitId && u.status !== "SOLD");

  const name = pick(p, "name", locale);
  const city = pick(p, "city", locale);
  const neighborhood = pick(p, "neighborhood", locale);
  const place = [neighborhood, city].filter(Boolean).join("، ");
  const priceRange = formatRange(p.priceMin, p.priceMax, (n) => formatPrice(n, locale));
  const areaRange = formatRange(p.areaMin, p.areaMax, (n) => formatArea(n, locale));
  const bedsRange = formatRange(p.bedroomsMin, p.bedroomsMax, (n) => formatNumber(n, locale));
  const delivery = pick(p, "delivery", locale);
  const salesPhone = p.salesPhone || contact.phones[0] || null;
  const wa = whatsappLink(p.salesWhatsapp || contact.whatsapp || "", `${locale === "ar" ? "استفسار عن مشروع" : "Inquiry about"} ${name}`);
  const mapHref = p.mapUrl || (p.latitude != null && p.longitude != null ? `https://www.google.com/maps?q=${p.latitude},${p.longitude}` : null);

  const gallery = [
    ...(p.coverImage ? [{ url: p.coverImage.url, alt: pick(p.coverImage, "alt", locale) || name }] : []),
    ...p.images.map((im) => ({ url: im.media.url, alt: pick(im.media, "alt", locale) || name, caption: pick(im, "caption", locale) || null })),
  ];
  const amenities = p.features.filter((f) => f.kind === "AMENITY");
  const facilities = p.features.filter((f) => f.kind === "FACILITY");
  const guarantees = p.features.filter((f) => f.kind === "GUARANTEE");

  const units: PublicUnit[] = p.units.map((u) => ({
    id: u.id,
    reference: u.reference,
    status: u.status as PublicUnit["status"],
    price: u.price != null ? formatPrice(u.price, locale) : null,
    area: u.area != null ? formatArea(u.area, locale) : null,
    bedrooms: u.bedrooms,
    bathrooms: u.bathrooms,
    floor: pick(u, "floor", locale) || null,
    type: u.propertyType ? pick(u.propertyType, "name", locale) : null,
    features: pick(u, "features", locale) || null,
    floorPlanUrl: u.floorPlan?.url ?? null,
  }));

  const info: [string, string | null][] = [
    [t.project.salesStatus, t.status.sales[p.salesStatus]],
    [t.project.constructionStatus, t.status.construction[p.constructionStatus]],
    [t.common.type, p.propertyType ? pick(p.propertyType, "name", locale) : null],
    [t.project.city, place || null],
    [t.project.priceRange, priceRange],
    [t.project.areaRange, areaRange],
    [t.project.bedroomsRange, bedsRange],
    [t.project.delivery, delivery || null],
  ];

  const url = absoluteUrl(`/${locale}/projects/${encodeURIComponent(locale === "ar" ? p.slugAr : p.slugEn)}`);
  const ld = {
    "@context": "https://schema.org",
    "@type": p.propertyType?.key === "apartment" ? "ApartmentComplex" : "Residence",
    name,
    description: pick(p, "summary", locale) || undefined,
    url,
    image: gallery.slice(0, 5).map((g) => absoluteUrl(g.url)),
    address: place ? { "@type": "PostalAddress", addressLocality: city || undefined, streetAddress: pick(p, "address", locale) || undefined, addressCountry: "SA" } : undefined,
    geo: p.latitude != null && p.longitude != null ? { "@type": "GeoCoordinates", latitude: p.latitude, longitude: p.longitude } : undefined,
    ...(p.priceMin != null && p.salesStatus === "AVAILABLE"
      ? { offers: { "@type": "AggregateOffer", priceCurrency: "SAR", lowPrice: p.priceMin, highPrice: p.priceMax ?? p.priceMin, availability: "https://schema.org/InStock" } }
      : {}),
  };

  const featureList = (items: typeof amenities, Icon: typeof CheckCircle2) => (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((f) => (
        <li key={f.id} className="flex items-start gap-3 rounded-xl border border-line bg-white p-4">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-sand-600" aria-hidden />
          <span>
            <span className="block text-sm font-medium text-ink">{pick(f, "label", locale)}</span>
            {pick(f, "detail", locale) && <span className="mt-0.5 block text-xs text-muted">{pick(f, "detail", locale)}</span>}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      <TrackView event="project_view" params={{ project_id: p.id, project_name: p.nameEn || p.nameAr }} dedupeKey={p.id} />

      <section className="relative isolate overflow-hidden bg-navy-950 text-white">
        {p.coverImage && <Image src={p.coverImage.url} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-50" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-950 via-navy-950/60 to-transparent" />
        <div className="container-page pb-12 pt-16 sm:pt-28">
          <Breadcrumbs light items={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.nav.projects, href: `/${locale}/projects` }, { label: name }]} />
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-navy-950">{t.status.sales[p.salesStatus]}</span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{t.status.construction[p.constructionStatus]}</span>
          </div>
          <h1 className="mt-4 text-3xl font-bold sm:text-5xl">{name}</h1>
          {place && <p className="mt-3 flex items-center gap-2 text-beige/85"><MapPin className="h-4 w-4 text-sand" aria-hidden />{place}</p>}
        </div>
      </section>

      {/* Sticky inquiry bar, like the reference: quick actions always within reach */}
      <div className="sticky top-[72px] z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
          <p className="text-sm font-semibold text-navy">{priceRange ? `${t.common.from} ${formatPrice(p.priceMin ?? p.priceMax!, locale)}` : t.project.interested}</p>
          <div className="flex flex-wrap gap-2">
            {salesPhone && <a href={`tel:${salesPhone}`} className="btn-outline py-2"><Phone className="h-4 w-4" aria-hidden />{t.common.call}</a>}
            {wa && <WhatsAppButton href={wa} label={t.common.whatsapp} projectId={p.id} className="py-2" />}
            <a href="#inquiry" className="btn-primary py-2">{t.project.requestDetails}</a>
          </div>
        </div>
      </div>

      <div className="container-page grid gap-12 py-12 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-14">
          {gallery.length > 0 && <Gallery images={gallery} rtl={locale === "ar"} label={t.project.gallery} />}

          {(pick(p, "summary", locale) || pick(p, "description", locale)) && (
            <section aria-labelledby="overview">
              <SectionHeading id="overview" title={t.project.overview} />
              {pick(p, "summary", locale) && <p className="text-lg leading-8 text-ink">{pick(p, "summary", locale)}</p>}
              {pick(p, "description", locale) && <div className="mt-4 whitespace-pre-line leading-8 text-muted">{pick(p, "description", locale)}</div>}
            </section>
          )}

          <section aria-labelledby="units">
            <SectionHeading id="units" title={t.project.units} />
            {units.length ? (
              <UnitsTable
                units={units}
                labels={{
                  all: t.project.unitFilterAll,
                  status: { AVAILABLE: t.status.unit.AVAILABLE, RESERVED: t.status.unit.RESERVED, SOLD: t.status.unit.SOLD },
                  priceOnRequest: t.project.priceOnRequest,
                  inquire: t.project.inquireUnit,
                  floorPlan: locale === "ar" ? "المخطط" : "Floor plan",
                  unit: t.project.unitRef,
                  bedrooms: t.common.bedrooms,
                  bathrooms: t.common.bathrooms,
                  area: t.common.area,
                  floor: t.common.floor,
                }}
              />
            ) : (
              <p className="rounded-xl bg-beige-50 p-5 text-sm text-muted">{t.project.unitsEmpty}</p>
            )}
          </section>

          <section aria-labelledby="info">
            <SectionHeading id="info" title={t.project.info} />
            <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {info.filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="grid grid-cols-2 gap-4 bg-white px-5 py-3.5 text-sm odd:bg-beige-50/60">
                  <dt className="font-medium text-ink">{k}</dt>
                  <dd className="text-muted">{v}</dd>
                </div>
              ))}
            </dl>
            {mapHref && (
              <a href={mapHref} target="_blank" rel="noopener noreferrer" className="btn-outline mt-4"><MapPin className="h-4 w-4" aria-hidden />{t.project.openMap}</a>
            )}
          </section>

          {p.nearby.length > 0 && (
            <section aria-labelledby="nearby">
              <SectionHeading id="nearby" title={t.project.nearby} />
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {p.nearby.map((n) => (
                  <li key={n.id} className="flex items-center gap-3 rounded-xl bg-beige-50 p-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy"><MapPin className="h-4 w-4" aria-hidden /></span>
                    <span>
                      <span className="block text-sm font-medium text-ink">{pick(n, "name", locale)}</span>
                      {n.minutes != null && <span className="text-xs text-muted"><Clock3 className="me-1 inline h-3 w-3" aria-hidden />{n.minutes} {t.common.minutes}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {amenities.length > 0 && <section aria-labelledby="amen"><SectionHeading id="amen" title={t.project.amenities} />{featureList(amenities, CheckCircle2)}</section>}
          {facilities.length > 0 && <section aria-labelledby="fac"><SectionHeading id="fac" title={t.project.facilities} />{featureList(facilities, CheckCircle2)}</section>}
          {guarantees.length > 0 && <section aria-labelledby="guar"><SectionHeading id="guar" title={t.project.guarantees} />{featureList(guarantees, ShieldCheck)}</section>}

          {p.videoUrl && (
            <section aria-labelledby="video">
              <SectionHeading id="video" title={t.project.video} />
              <a href={p.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">{t.project.video} ↗</a>
            </section>
          )}
        </div>

        <aside id="inquiry" className="scroll-mt-40 lg:sticky lg:top-40 lg:self-start">
          <div className="card overflow-hidden">
            <div className="bg-navy px-6 py-5 text-white">
              <h2 className="text-lg font-semibold">{t.project.interested}</h2>
              <p className="mt-1 text-sm leading-6 text-beige/80">{t.project.interestedText}</p>
              {selectedUnit && <p className="mt-3 rounded-md bg-white/10 px-3 py-2 text-sm">{t.project.unitRef} #{selectedUnit.reference}</p>}
            </div>
            <div className="p-6">
              <LeadForm
                locale={locale}
                t={t.forms}
                sendLabel={t.project.requestDetails}
                sendingLabel={t.common.sending}
                source="PROJECT_INQUIRY"
                projectId={p.id}
                unitId={selectedUnit?.id}
                privacyHref={`/${locale}/privacy`}
              />
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="bg-beige-50 py-16">
          <div className="container-page">
            <SectionHeading title={t.project.related} />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => <ProjectCard key={r.id} p={r} locale={locale} t={t} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

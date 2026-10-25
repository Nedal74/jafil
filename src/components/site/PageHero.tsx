import { Breadcrumbs, type Crumb } from "./Breadcrumbs";

export function PageHero({ title, subtitle, crumbs }: { title: string; subtitle?: string | null; crumbs: Crumb[] }) {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 end-0 w-1/2 opacity-[0.07] [background:repeating-linear-gradient(135deg,#f0e7d6_0_2px,transparent_2px_22px)]" />
      <div className="container-page relative py-14 sm:py-20">
        <Breadcrumbs items={crumbs} light />
        <h1 className="mt-5 text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl leading-8 text-beige/80">{subtitle}</p>}
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";

export type HeroSlide = {
  id: string;
  title: string;
  place: string;
  status: string;
  href: string;
  image: string | null;
  alt: string;
};

export function HeroCarousel({
  slides,
  fallbackTitle,
  fallbackSubtitle,
  ctaLabel,
  rtl,
  primaryHref,
  primaryLabel,
}: {
  slides: HeroSlide[];
  fallbackTitle: string;
  fallbackSubtitle: string;
  ctaLabel: string;
  rtl: boolean;
  primaryHref: string;
  primaryLabel: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => go(1), 7000);
    return () => clearInterval(t);
  }, [count, paused, go]);

  if (!count) {
    return (
      <section className="relative overflow-hidden bg-navy text-white">
        <div aria-hidden className="absolute inset-0 opacity-[0.08] [background:repeating-linear-gradient(135deg,#f0e7d6_0_2px,transparent_2px_26px)]" />
        <div className="container-page relative flex min-h-[460px] flex-col justify-center py-20">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl animate-fade-up">{fallbackTitle}</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-beige/80">{fallbackSubtitle}</p>
          <div className="mt-8"><Link href={primaryHref} className="btn-sand px-6 py-3">{primaryLabel}</Link></div>
        </div>
      </section>
    );
  }

  const slide = slides[index]!;
  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;

  return (
    <section
      className="relative isolate overflow-hidden bg-navy-950 text-white"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <div key={s.id} aria-hidden={i !== index} className={`absolute inset-0 -z-10 transition-opacity duration-1000 ${i === index ? "opacity-100" : "opacity-0"}`}>
          {s.image && <Image src={s.image} alt={i === index ? s.alt : ""} fill priority={i === 0} sizes="100vw" className="object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/40 to-navy-950/20" />
        </div>
      ))}
      <div className="container-page flex min-h-[520px] flex-col justify-end pb-16 pt-28 sm:min-h-[620px]">
        <div key={slide.id} className="max-w-2xl animate-fade-up" aria-live="polite">
          <span className="inline-flex rounded-full bg-sand/90 px-3 py-1 text-xs font-semibold text-navy-950">{slide.status}</span>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">{slide.title}</h1>
          {slide.place && (
            <p className="mt-3 flex items-center gap-2 text-beige/85"><MapPin className="h-4 w-4 text-sand" aria-hidden />{slide.place}</p>
          )}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={slide.href} className="btn-sand px-6 py-3">{ctaLabel}</Link>
            <Link href={primaryHref} className="btn-ghost-light px-6 py-3">{primaryLabel}</Link>
          </div>
        </div>
        {count > 1 && (
          <div className="mt-10 flex items-center gap-4">
            <button type="button" onClick={() => go(-1)} aria-label="previous" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 hover:bg-white hover:text-navy"><Prev className="h-5 w-5" /></button>
            <div className="flex gap-2">
              {slides.map((s, i) => (
                <button key={s.id} type="button" aria-label={s.title} aria-current={i === index} onClick={() => setIndex(i)} className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-sand" : "w-4 bg-white/40"}`} />
              ))}
            </div>
            <button type="button" onClick={() => go(1)} aria-label="next" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 hover:bg-white hover:text-navy"><Next className="h-5 w-5" /></button>
          </div>
        )}
      </div>
    </section>
  );
}

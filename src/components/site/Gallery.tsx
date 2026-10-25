"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type GalleryImage = { url: string; alt: string; caption?: string | null };

export function Gallery({ images, rtl, label }: { images: GalleryImage[]; rtl: boolean; label: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const count = images.length;
  const go = (d: number) => setActive((i) => (i + d + count) % count);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") go(rtl ? -1 : 1);
      if (e.key === "ArrowLeft") go(rtl ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!count) return null;
  const img = images[active]!;
  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;

  return (
    <div role="region" aria-label={label}>
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-beige">
        <button type="button" className="absolute inset-0 cursor-zoom-in" onClick={() => setLightbox(true)} aria-label={img.alt}>
          <Image src={img.url} alt={img.alt} fill sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" />
        </button>
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="previous" className="absolute start-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow hover:bg-white"><Prev className="h-5 w-5" /></button>
            <button type="button" onClick={() => go(1)} aria-label="next" className="absolute end-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow hover:bg-white"><Next className="h-5 w-5" /></button>
          </>
        )}
      </div>
      {img.caption && <p className="mt-2 text-sm text-muted">{img.caption}</p>}
      {count > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((im, i) => (
            <li key={im.url} className="shrink-0">
              <button type="button" onClick={() => setActive(i)} aria-current={i === active} aria-label={im.alt} className={`relative block h-16 w-24 overflow-hidden rounded-lg ring-2 ${i === active ? "ring-sand" : "ring-transparent opacity-70 hover:opacity-100"}`}>
                <Image src={im.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {lightbox && (
        <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/95 p-4" onClick={() => setLightbox(false)}>
          <button type="button" className="absolute end-4 top-4 rounded-full p-2 text-white hover:bg-white/10" aria-label="close" onClick={() => setLightbox(false)} autoFocus><X className="h-6 w-6" /></button>
          <div className="relative h-full max-h-[85vh] w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <Image src={img.url} alt={img.alt} fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

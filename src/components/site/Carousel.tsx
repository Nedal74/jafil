"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Accessible scroll-snap carousel: native scrolling, keyboard-friendly, no JS required to read content. */
export function Carousel({ children, label, rtl }: { children: React.ReactNode; label: string; rtl: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85 * dir * (rtl ? -1 : 1);
    el.scrollBy({ left: amount, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;
  return (
    <div className="relative" role="region" aria-label={label}>
      <div ref={ref} className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pb-4 [scrollbar-width:thin]">
        {children}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={() => scroll(-1)} aria-label="previous" className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-navy hover:bg-navy hover:text-white"><Prev className="h-5 w-5" /></button>
        <button type="button" onClick={() => scroll(1)} aria-label="next" className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-navy hover:bg-navy hover:text-white"><Next className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

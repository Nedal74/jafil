"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, Bot, Building2, Gauge, History, Image as ImageIcon, Info, Landmark, LayoutTemplate, LayoutGrid,
  Menu, Newspaper, Phone, Search, Settings, ShieldCheck, Tags, Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ICONS = {
  gauge: Gauge, users: Users, landmark: Landmark, building: Building2, grid: LayoutGrid, tags: Tags, newspaper: Newspaper,
  layout: LayoutTemplate, info: Info, phone: Phone, image: ImageIcon, search: Search, chart: BarChart3, bot: Bot,
  shield: ShieldCheck, history: History, settings: Settings,
};

export function AdminNav({ items }: { items: { href: string; label: string; icon: string }[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  return (
    <>
      <button type="button" className="mx-5 mb-3 flex items-center gap-2 text-sm lg:hidden" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Menu className="h-4 w-4" /> القائمة
      </button>
      <nav aria-label="قائمة لوحة التحكم" className={cn("px-3 pb-4", !open && "hidden lg:block")}>
        <ul className="space-y-0.5">
          {items.map((i) => {
            const Icon = ICONS[i.icon as keyof typeof ICONS] ?? Gauge;
            return (
              <li key={i.href}>
                <Link
                  href={i.href}
                  onClick={() => setOpen(false)}
                  aria-current={active(i.href) ? "page" : undefined}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-beige/80 transition-colors hover:bg-white/5 hover:text-white aria-[current=page]:bg-white/10 aria-[current=page]:text-white"
                >
                  <Icon className="h-4 w-4 shrink-0 text-sand" aria-hidden />
                  {i.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

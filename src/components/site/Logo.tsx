import Image from "next/image";
import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";

export function Logo({ locale, variant = "dark" }: { locale: Locale; variant?: "dark" | "light" }) {
  const light = variant === "light";
  return (
    <Link href={`/${locale}`} className="group flex items-center gap-3" aria-label={locale === "ar" ? "مساكن الجافل العقارية — الرئيسية" : "Masaken Aljafil — Home"}>
      <Image
        src={light ? "/brand/logo-white.png" : "/brand/logo-navy.png"}
        alt=""
        width={44}
        height={44}
        priority
        className="h-11 w-11 object-contain"
      />
      <span className="flex flex-col leading-tight">
        <span className={`text-base font-bold ${light ? "text-white" : "text-navy"}`}>مساكن الجافل</span>
        <span className={`text-[10px] font-medium uppercase tracking-[0.18em] ${light ? "text-beige/80" : "text-sand-600"}`}>
          Masaken Aljafil
        </span>
      </span>
    </Link>
  );
}

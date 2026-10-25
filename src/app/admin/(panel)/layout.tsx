import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";

import { AdminNav } from "@/components/admin/AdminNav";
import { can, ROLE_LABELS, type Permission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { logoutAction } from "../auth-actions";

const NAV: { href: string; label: string; icon: string; perm: Permission }[] = [
  { href: "/admin", label: "نظرة عامة", icon: "gauge", perm: "dashboard.view" },
  { href: "/admin/leads", label: "العملاء المحتملون", icon: "users", perm: "leads.view" },
  { href: "/admin/financing", label: "طلبات التمويل", icon: "landmark", perm: "financing.view" },
  { href: "/admin/projects", label: "المشاريع والوحدات", icon: "building", perm: "projects.manage" },
  { href: "/admin/units", label: "مخزون الوحدات", icon: "grid", perm: "units.manage" },
  { href: "/admin/property-types", label: "أنواع العقار", icon: "tags", perm: "projects.manage" },
  { href: "/admin/articles", label: "الأخبار والمقالات", icon: "newspaper", perm: "articles.manage" },
  { href: "/admin/homepage", label: "الصفحة الرئيسية", icon: "layout", perm: "content.manage" },
  { href: "/admin/company", label: "الشركة وكلمة الرئيس", icon: "info", perm: "content.manage" },
  { href: "/admin/contact", label: "التواصل والشبكات", icon: "phone", perm: "content.manage" },
  { href: "/admin/media", label: "مكتبة الوسائط", icon: "image", perm: "media.manage" },
  { href: "/admin/seo", label: "تحسين محركات البحث", icon: "search", perm: "seo.manage" },
  { href: "/admin/integrations", label: "تكاملات Google", icon: "chart", perm: "integrations.manage" },
  { href: "/admin/assistant", label: "المساعد العقاري", icon: "bot", perm: "assistant.conversations.view" },
  { href: "/admin/users", label: "المستخدمون والصلاحيات", icon: "shield", perm: "users.manage" },
  { href: "/admin/audit", label: "سجل التدقيق", icon: "history", perm: "audit.view" },
  { href: "/admin/settings", label: "إعدادات الموقع", icon: "settings", perm: "settings.manage" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("dashboard.view");
  const items = NAV.filter((n) => can(user.role, n.perm)).map((n) => ({ href: n.href, label: n.label, icon: n.icon }));

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[260px_1fr]">
      <aside className="bg-navy text-beige lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image src="/brand/logo-white.png" alt="" width={36} height={36} />
            <span className="text-sm font-semibold text-white">مساكن الجافل</span>
          </Link>
          <Link href="/ar" target="_blank" className="text-xs text-beige/70 hover:text-white">عرض الموقع ↗</Link>
        </div>
        <AdminNav items={items} />
        <div className="hidden border-t border-white/10 px-5 py-4 lg:block">
          <p className="text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-beige/60">{ROLE_LABELS[user.role]}</p>
          <form action={logoutAction} className="mt-3">
            <button className="inline-flex items-center gap-2 text-xs text-beige/80 hover:text-white"><LogOut className="h-3.5 w-3.5" /> تسجيل الخروج</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-2 text-xs text-muted lg:hidden">
          <span>{user.name} — {ROLE_LABELS[user.role]}</span>
          <form action={logoutAction}><button className="inline-flex items-center gap-1 hover:text-navy"><LogOut className="h-3.5 w-3.5" /> خروج</button></form>
        </div>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

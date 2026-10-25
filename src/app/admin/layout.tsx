import "../globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "لوحة التحكم", template: "%s | لوحة تحكم مساكن الجافل" },
  robots: { index: false, follow: false },
  icons: { icon: "/brand/logo-navy.png" },
};

export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-dvh bg-[#f7f5f1]">{children}</body>
    </html>
  );
}

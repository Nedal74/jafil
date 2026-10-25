import { notFound, permanentRedirect } from "next/navigation";

import { findRedirect } from "@/lib/public-data";

/** Catch-all: honours admin-managed redirects, otherwise renders the localized 404. */
export default async function CatchAll({ params }: { params: Promise<{ locale: string; rest: string[] }> }) {
  const { locale, rest } = await params;
  const path = `/${locale}/${rest.map(decodeURIComponent).join("/")}`;
  const r = await findRedirect(path);
  if (r) permanentRedirect(r.toPath);
  notFound();
}

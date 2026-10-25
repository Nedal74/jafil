import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["ar", "en"];
const SESSION_COOKIES = ["__Host-aljafil_session", "aljafil_session"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    // Cheap presence check only; every admin page/action re-validates the session in the database.
    const hasSession = SESSION_COOKIES.some((c) => req.cookies.has(c));
    if (!hasSession && pathname !== "/admin/login" && pathname !== "/admin/setup") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const first = pathname.split("/")[1];
  if (!LOCALES.includes(first ?? "")) {
    const url = req.nextUrl.clone();
    const pref = req.cookies.get("locale")?.value;
    const locale = pref && LOCALES.includes(pref) ? pref : "ar";
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url, 307);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|media|_next/static|_next/image|brand|favicon.ico|icon|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};

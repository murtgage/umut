import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16'da `middleware.ts` yerini `proxy.ts` aldı.
 *
 * DİKKAT: Buradaki kontrol yalnızca kullanıcı deneyimi içindir (gereksiz
 * yönlendirmeleri önlemek). Gerçek yetki kontrolü her zaman sunucu eylemi ve
 * route handler içinde tekrar yapılır.
 */

const PROTECTED_PREFIXES = ["/oyna", "/oyun", "/profil"];
const AUTH_PAGES = ["/giris", "/kayit"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!hasSession && isProtected) {
    const url = new URL("/giris", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/oyna", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/oyna/:path*", "/oyun/:path*", "/profil/:path*", "/giris", "/kayit"],
};

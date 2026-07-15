import { NextResponse, type NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "freya_admin_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin/");
  const isAdminLogin = pathname === "/admin/login" || pathname === "/admin/login/";

  if (!isAdmin && !isAdminApi) return NextResponse.next();

  if (isAdmin && !isAdminLogin && !request.cookies.get(ADMIN_SESSION_COOKIE)?.value) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login/";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

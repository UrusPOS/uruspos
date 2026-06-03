import { NextResponse, type NextRequest } from "next/server";
import { canAccessDashboard, getDefaultRedirect } from "@/lib/auth/permissions";
import { PUBLIC_ROUTES } from "@/lib/constants/roles";
import {
  parseSessionCookie,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import type { UserRole } from "@/types/auth";

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isDashboardRoute(pathname: string): boolean {
  return pathname.startsWith("/dashboard");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = parseSessionCookie(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  if (session && pathname === "/") {
    return NextResponse.redirect(
      new URL(getDefaultRedirect(session.role as UserRole), request.url)
    );
  }

  if (!session) {
    if (isPublicRoute(pathname) || !isDashboardRoute(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isDashboardRoute(pathname)) {
    if (!canAccessDashboard(session.role as UserRole, pathname)) {
      return NextResponse.redirect(
        new URL(getDefaultRedirect(session.role as UserRole), request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { UserRole } from "@prisma/client";
import { canAccessRoute } from "@/lib/permissions";

const publicPaths = ["/login", "/api/auth", "/qr"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/kalender" || pathname.startsWith("/kalender/")) {
    return NextResponse.redirect(new URL("/planung", request.url));
  }

  const removedDemoPaths = ["/messen-demos", "/wartungen", "/standorte"];
  if (removedDemoPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as UserRole | undefined;
  if (role && !canAccessRoute(role, pathname)) {
    return NextResponse.redirect(new URL("/dashboard?error=keine_berechtigung", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|flx-logo.svg|flx-rent-logo.png|darda-logo.png|products/).*)"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ["/login", "/api/auth", "/api/uploads", "/qr"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/kalender" || pathname.startsWith("/kalender/")) {
    return NextResponse.redirect(new URL("/planung", request.url));
  }

  if (pathname === "/wartungen" || pathname.startsWith("/wartungen/")) {
    return NextResponse.redirect(new URL("/produkte", request.url));
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|flx-logo.svg|darda-logo.png|products/).*)"],
};

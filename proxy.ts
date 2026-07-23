import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

const ROLE_HIERARCHY: Record<string, UserRole> = {
  "/admin": UserRole.MAIN_ADMIN,
  "/api/admin": UserRole.MAIN_ADMIN,
  "/warden": UserRole.WARDEN,
  "/api/warden": UserRole.WARDEN,
  "/tenant": UserRole.TENANT,
  "/api/tenant": UserRole.TENANT,
};

const PUBLIC_ROUTES = [
  "/login",
  "/admin-login",
  "/set-password",
  "/onboarding",
  "/onboard",
  "/newuser",
  "/api/public",
  "/api/auth",
];

function getRequiredRole(pathname: string): UserRole | null {
  for (const [prefix, role] of Object.entries(ROLE_HIERARCHY)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return role;
    }
  }
  return null;
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const isApiRoute = pathname.startsWith("/api/");
    const requiredRole = getRequiredRole(pathname);

    // Allow public routes
    if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
      return NextResponse.next();
    }

    // Allow routes with no role requirements (that aren't API routes)
    if (!requiredRole && !isApiRoute) {
      return NextResponse.next();
    }

    const token = req.nextauth.token;

    if (!token) {
      if (isApiRoute) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const isStaffRoute = pathname.startsWith("/admin") || pathname.startsWith("/warden");
      const loginUrl = new URL(isStaffRoute ? "/admin-login" : "/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // We no longer need to fetch from the DB because the DB role is injected into the NextAuth token!
    const userRole = token.role as UserRole;
    const passwordSetAt = token.passwordSetAt;

    if (!userRole) {
      if (isApiRoute) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Force first-time password setup
    if (!passwordSetAt && pathname !== "/set-password") {
      if (isApiRoute) {
        if (pathname !== "/api/auth/set-password" && pathname !== "/api/auth/logout") {
          return NextResponse.json({ error: "Password setup required" }, { status: 403 });
        }
      } else {
        return NextResponse.redirect(new URL("/set-password", req.url));
      }
    }

    // MAIN_ADMIN bypass
    if (userRole === UserRole.MAIN_ADMIN) {
      return NextResponse.next();
    }

    if (requiredRole && userRole !== requiredRole) {
      if (isApiRoute) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const loginUrl = new URL(pathname.startsWith("/admin") || pathname.startsWith("/warden") ? "/admin-login" : "/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // Let the middleware function handle all auth logic
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

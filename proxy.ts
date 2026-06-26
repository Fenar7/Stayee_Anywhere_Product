import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

const ROLE_HIERARCHY: Record<string, UserRole> = {
  "/admin": UserRole.MAIN_ADMIN,
  "/api/admin": UserRole.MAIN_ADMIN,
  "/warden": UserRole.WARDEN,
  "/api/warden": UserRole.WARDEN,
  "/tenant": UserRole.TENANT,
  "/api/tenant": UserRole.TENANT,
};

const PUBLIC_ROUTES = ["/login", "/set-password"];

function getRequiredRole(pathname: string): UserRole | null {
  for (const [prefix, role] of Object.entries(ROLE_HIERARCHY)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return role;
    }
  }
  return null;
}

function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const rememberMeCookie = request.cookies.get("remember_me");
  const maxAge = rememberMeCookie ? 30 * 24 * 60 * 60 : undefined;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            const finalMaxAge = options.maxAge === 0 ? 0 : (maxAge !== undefined ? maxAge : options.maxAge);
            supabaseResponse.cookies.set(name, value, {
              ...options,
              maxAge: finalMaxAge,
            })
          });
        },
      },
    }
  );

  return { supabase, supabaseResponse };
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  const response = NextResponse.redirect(loginUrl);
  // Clear the remember_me cookie. We rely on the /login page mounting to call supabase.auth.signOut() to clear the chunked session cookies properly.
  response.cookies.set("remember_me", "", { maxAge: 0, path: "/" });
  return response;
}

function jsonError(status: number, message: string, code: string): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const requiredRole = getRequiredRole(pathname);

  console.log(`[Proxy Log] pathname: ${pathname}, isApiRoute: ${isApiRoute}, requiredRole: ${requiredRole}`);

  if (!requiredRole && !isApiRoute) {
    console.log(`[Proxy Log] Allowing route because it has no required role and is not api: ${pathname}`);
    return NextResponse.next();
  }

  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    console.log(`[Proxy Log] Allowing public route: ${pathname}`);
    return NextResponse.next();
  }

  const { supabase, supabaseResponse } = updateSession(request);

  let supabaseUserId: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user?.id) {
      throw new Error("No session");
    }
    supabaseUserId = data.session.user.id;
  } catch {
    if (requiredRole) {
      if (isApiRoute) {
        return jsonError(401, "Unauthorized", "UNAUTHORIZED");
      }
      return redirectToLogin(request);
    }
    return supabaseResponse;
  }

  if (!requiredRole) {
    return supabaseResponse;
  }

  let dbUser: { role: UserRole; passwordSetAt: Date | null } | null = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { supabaseAuthId: supabaseUserId },
      select: { role: true, passwordSetAt: true },
    });
  } catch {
    return supabaseResponse;
  }

  if (!dbUser) {
    console.log(`[Proxy Log] dbUser not found, redirecting to login. pathname: ${pathname}`);
    if (isApiRoute) {
      return jsonError(401, "Unauthorized", "UNAUTHORIZED");
    }
    return redirectToLogin(request);
  }

  // Force first-time password setup if passwordSetAt is null
  if (dbUser.passwordSetAt === null && pathname !== "/set-password") {
    console.log(`[Proxy Log] Force password setup required. passwordSetAt: ${dbUser.passwordSetAt}, pathname: ${pathname}`);
    if (isApiRoute) {
      if (pathname !== "/api/auth/set-password" && pathname !== "/api/auth/logout") {
        console.log(`[Proxy Log] Blocking API request due to password setup requirement: ${pathname}`);
        return jsonError(403, "Password setup required", "PASSWORD_SETUP_REQUIRED");
      }
    } else {
      console.log(`[Proxy Log] Redirecting to /set-password from: ${pathname}`);
      return NextResponse.redirect(new URL("/set-password", request.url));
    }
  }

  // MAIN_ADMIN is a superuser — treat as having all role permissions
  if (dbUser.role === UserRole.MAIN_ADMIN) {
    console.log(`[Proxy Log] Main Admin bypass for route: ${pathname}`);
    return supabaseResponse;
  }

  if (dbUser.role !== requiredRole) {
    console.log(`[Proxy Log] Role mismatch. User role: ${dbUser.role}, required: ${requiredRole}, pathname: ${pathname}`);
    if (isApiRoute) {
      return jsonError(403, "Forbidden", "FORBIDDEN");
    }
    return redirectToLogin(request);
  }

  console.log(`[Proxy Log] Allowing route to proceed: ${pathname}`);
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

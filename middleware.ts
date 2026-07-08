import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

const ROLE_HIERARCHY: Record<string, UserRole> = {
  "/admin": UserRole.MAIN_ADMIN,
  "/api/admin": UserRole.MAIN_ADMIN,
  "/warden": UserRole.WARDEN,
  "/api/warden": UserRole.WARDEN,
  "/tenant": UserRole.TENANT,
  "/api/tenant": UserRole.TENANT,
};

const PUBLIC_ROUTES = ["/login", "/admin-login", "/set-password"];

function getRequiredRole(pathname: string): UserRole | null {
  for (const [prefix, role] of Object.entries(ROLE_HIERARCHY)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return role;
    }
  }
  return null;
}

function updateSession(request: NextRequest) {
  // Wrap response in a mutable object so setAll can update the reference
  const responseRef = {
    current: NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  };

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
          
          responseRef.current = NextResponse.next({
            request: {
              headers: request.headers,
            }
          });
          
          cookiesToSet.forEach(({ name, value, options }) => {
            const finalMaxAge = options.maxAge === 0 ? 0 : (maxAge !== undefined ? maxAge : options.maxAge);
            responseRef.current.cookies.set(name, value, {
              ...options,
              maxAge: finalMaxAge,
            })
          });
        },
      },
    }
  );

  return { supabase, responseRef };
}

function redirectToLogin(request: NextRequest): NextResponse {
  const isStaffRoute = request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/warden");
  const loginPath = isStaffRoute ? "/admin-login" : "/login";
  const loginUrl = new URL(loginPath, request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  const response = NextResponse.redirect(loginUrl);
  // Clear the remember_me cookie. We rely on the /login page mounting to call supabase.auth.signOut() to clear the chunked session cookies properly.
  response.cookies.set("remember_me", "", { maxAge: 0, path: "/" });
  return response;
}

function jsonError(status: number, message: string, code: string): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const requiredRole = getRequiredRole(pathname);

  console.log(`[Middleware Log] pathname: ${pathname}, isApiRoute: ${isApiRoute}, requiredRole: ${requiredRole}`);

  if (!requiredRole && !isApiRoute) {
    console.log(`[Middleware Log] Allowing route because it has no required role and is not api: ${pathname}`);
    return NextResponse.next();
  }

  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    console.log(`[Proxy Log] Allowing public route: ${pathname}`);
    return NextResponse.next();
  }

  const { supabase, responseRef } = updateSession(request);

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
    return responseRef.current;
  }

  if (!requiredRole) {
    return responseRef.current;
  }

  let dbUser: { role: UserRole; passwordSetAt: Date | null } | null = null;
  try {
    const res = await fetch(`${request.nextUrl.origin}/api/internal/auth-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ userId: supabaseUserId }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.dbUser) {
        dbUser = {
          role: data.dbUser.role as UserRole,
          passwordSetAt: data.dbUser.passwordSetAt ? new Date(data.dbUser.passwordSetAt) : null,
        };
      }
    } else {
      console.error(`[Middleware Log] internal auth-check failed: ${res.status}`);
      if (isApiRoute) return jsonError(401, "Unauthorized", "UNAUTHORIZED");
      return redirectToLogin(request);
    }
  } catch (err) {
    console.error(`[Middleware Log] internal auth-check error:`, err);
    if (isApiRoute) return jsonError(401, "Unauthorized", "UNAUTHORIZED");
    return redirectToLogin(request);
  }

  if (!dbUser) {
    console.log(`[Middleware Log] dbUser not found, redirecting to login. pathname: ${pathname}`);
    if (isApiRoute) {
      return jsonError(401, "Unauthorized", "UNAUTHORIZED");
    }
    return redirectToLogin(request);
  }

  // Force first-time password setup if passwordSetAt is null
  if (dbUser.passwordSetAt === null && pathname !== "/set-password") {
    console.log(`[Middleware Log] Force password setup required. passwordSetAt: ${dbUser.passwordSetAt}, pathname: ${pathname}`);
    if (isApiRoute) {
      if (pathname !== "/api/auth/set-password" && pathname !== "/api/auth/logout") {
        console.log(`[Middleware Log] Blocking API request due to password setup requirement: ${pathname}`);
        return jsonError(403, "Password setup required", "PASSWORD_SETUP_REQUIRED");
      }
    } else {
      console.log(`[Middleware Log] Redirecting to /set-password from: ${pathname}`);
      return NextResponse.redirect(new URL("/set-password", request.url));
    }
  }

  // MAIN_ADMIN is a superuser — treat as having all role permissions
  if (dbUser.role === UserRole.MAIN_ADMIN) {
    console.log(`[Middleware Log] Main Admin bypass for route: ${pathname}`);
    return responseRef.current;
  }

  if (dbUser.role !== requiredRole) {
    console.log(`[Middleware Log] Role mismatch. User role: ${dbUser.role}, required: ${requiredRole}, pathname: ${pathname}`);
    if (isApiRoute) {
      return jsonError(403, "Forbidden", "FORBIDDEN");
    }
    return redirectToLogin(request);
  }

  console.log(`[Middleware Log] Allowing route to proceed: ${pathname}`);
  return responseRef.current;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

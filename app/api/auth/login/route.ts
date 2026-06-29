import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createSupabaseServerClient, createAdminClient } from "@/lib/auth/server";
import { authenticateUser } from "@/services/auth/auth.service";
import { handleApiError } from "@/lib/errors";
import { loginSchema } from "@/lib/validation/auth";
import { prisma } from "@/lib/db";



export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = loginSchema.parse(body);
    const rememberMe = body.rememberMe === true;

    const isEmail = identifier.includes("@");

    // Set remember_me cookie BEFORE creating the Supabase client so that
    // the createClient() call can read it and apply maxAge to setAll()
    if (rememberMe) {
      const cookieStore = await cookies();
      cookieStore.set("remember_me", "true", {
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    // Helper to normalize phone for DB lookup
    const normalizePhone = (p: string) => p.replace(/^\+91/, "").replace(/^\+/, "").trim();
    
    // 1. Look up user in Prisma first to tolerate formatting differences
    let dbUser = null;
    if (isEmail) {
      dbUser = await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });
    } else {
      // Try exact match first
      dbUser = await prisma.user.findUnique({ where: { phone: identifier } });
      if (!dbUser) {
        // Try normalized match
        const norm = normalizePhone(identifier);
        dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { phone: norm },
              { phone: `+91${norm}` },
              { phone: `+${norm}` }
            ]
          }
        });
      }
    }

    if (!dbUser) {
      return NextResponse.json(
        { error: "Invalid credentials", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const supabase = await createSupabaseServerClient(rememberMe);
    
    // 2. Fetch the exact phone/email from Supabase using their Auth ID to ensure we use the exact string Supabase expects
    // Note: We always prefer EMAIL here, even if they logged in with their phone number, 
    // because Phone Auth is often disabled in Supabase project settings.
    let authIdentifier = {};
    if (dbUser.supabaseAuthId) {
      const { data: authDataObj } = await createAdminClient().auth.admin.getUserById(dbUser.supabaseAuthId);
      if (authDataObj?.user) {
        if (authDataObj.user.email) {
          authIdentifier = { email: authDataObj.user.email };
        } else if (authDataObj.user.phone) {
          authIdentifier = { phone: authDataObj.user.phone };
        } else {
          // fallback
          authIdentifier = dbUser.email ? { email: dbUser.email } : { phone: dbUser.phone };
        }
      } else {
        authIdentifier = dbUser.email ? { email: dbUser.email } : { phone: dbUser.phone };
      }
    } else {
      authIdentifier = dbUser.email ? { email: dbUser.email } : { phone: dbUser.phone };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      ...authIdentifier,
      password,
    } as any);

    if (error || !data.session) {
      // Auth failed — clean up the remember_me cookie
      const cookieStore = await cookies();
      cookieStore.set("remember_me", "", { maxAge: 0, path: "/" });
      return NextResponse.json(
        { error: "Invalid credentials", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const result = await authenticateUser({ identifier: isEmail ? dbUser.email! : dbUser.phone, password });

    return NextResponse.json({
      role: result.user.role,
      redirectUrl: result.redirectUrl,
      passwordSetAt: result.user.passwordSetAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

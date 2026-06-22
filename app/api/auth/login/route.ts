import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createClient as createSupabaseServerClient } from "@/lib/auth/server";
import { authenticateUser } from "@/services/auth/auth.service";
import { handleApiError } from "@/lib/errors";
import { rateLimit, extractIp } from "@/lib/rate-limit";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const ip = extractIp(request);
    const rl = await rateLimit(`login_${ip}`, { limit: 5, windowMs: 60 * 1000 });
    
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": Math.ceil((rl.resetTime - Date.now()) / 1000).toString() } }
      );
    }
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

    const supabase = await createSupabaseServerClient();
    const authData = isEmail
      ? { email: identifier.toLowerCase() }
      : { phone: identifier };

    const { data, error } = await supabase.auth.signInWithPassword({
      ...authData,
      password,
    });

    if (error || !data.session) {
      // Auth failed — clean up the remember_me cookie
      const cookieStore = await cookies();
      cookieStore.set("remember_me", "", { maxAge: 0, path: "/" });
      return NextResponse.json(
        { error: "Invalid credentials", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const result = await authenticateUser({ identifier, password });

    return NextResponse.json({
      role: result.user.role,
      redirectUrl: result.redirectUrl,
      passwordSetAt: result.user.passwordSetAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

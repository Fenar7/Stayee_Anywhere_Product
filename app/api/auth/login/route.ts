import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/auth/server";
import { authenticateUser } from "@/services/auth/auth.service";
import { handleApiError } from "@/lib/errors";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = loginSchema.parse(body);

    const isEmail = identifier.includes("@");

    const supabase = await createClient();
    const authData = isEmail
      ? { email: identifier.toLowerCase() }
      : { phone: identifier };

    const { data, error } = await supabase.auth.signInWithPassword({
      ...authData,
      password,
    });

    if (error || !data.session) {
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

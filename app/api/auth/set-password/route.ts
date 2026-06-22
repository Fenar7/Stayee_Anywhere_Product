import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/auth/server";
import { fetchUserBySupabaseId, setUserPasswordSetAt } from "@/services/auth/auth.service";
import { handleApiError } from "@/lib/errors";

const setPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = setPasswordSchema.parse(body);

    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update password", code: "UPDATE_FAILED" },
        { status: 400 }
      );
    }

    const dbUser = await fetchUserBySupabaseId(authUser.id);
    await setUserPasswordSetAt(dbUser.id);

    const redirectMap = {
      MAIN_ADMIN: "/admin",
      WARDEN: "/warden",
      TENANT: "/tenant",
    } as const;

    return NextResponse.json({ redirectUrl: redirectMap[dbUser.role] });
  } catch (error) {
    return handleApiError(error);
  }
}

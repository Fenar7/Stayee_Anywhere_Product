import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    const response = NextResponse.json({ success: true });
    response.cookies.set("sb-auth-token", "", { maxAge: 0, path: "/" });
    response.cookies.set("supabase-auth-token", "", { maxAge: 0, path: "/" });
    return response;
  } catch {
    return NextResponse.json({ success: true });
  }
}

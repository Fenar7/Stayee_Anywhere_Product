import { redirect } from "next/navigation";
import { createClient } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    select: { role: true },
  });

  if (!dbUser) {
    redirect("/login");
  }

  if (dbUser.role === UserRole.MAIN_ADMIN) {
    redirect("/admin");
  } else if (dbUser.role === UserRole.WARDEN) {
    redirect("/warden");
  } else if (dbUser.role === UserRole.TENANT) {
    redirect("/tenant");
  }

  redirect("/login");
}


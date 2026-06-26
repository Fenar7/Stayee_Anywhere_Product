import { createAdminClient } from './lib/auth/server';
import { prisma } from './lib/db';

async function main() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "human@gmail.com",
    password: "6a477c36A1!"
  });
  console.log("Sign in with email result:", data?.session ? "Success" : "Failed", error);

  const { data: data2, error: error2 } = await supabase.auth.signInWithPassword({
    phone: "919999999999",
    password: "6a477c36A1!"
  });
  console.log("Sign in with phone result:", data2?.session ? "Success" : "Failed", error2);
}

main().catch(console.error).finally(() => prisma.$disconnect());

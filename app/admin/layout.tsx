import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import AdminShell from "./shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireRole([UserRole.MAIN_ADMIN]);

  return (
    <AdminShell userName={user.phone} role={user.role}>
      {children}
    </AdminShell>
  );
}
